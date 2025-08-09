const express = require("express");
const app = express();
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT;

//mysql connection
const mysql = require("mysql2");
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database: " + err.stack);
    return;
  }
  console.log("Connected to database as host: " + connection.config.host);
  // Ensure the table exists and has proper schema
  ensureSchoolTable();
  return connection;
});

//middleares
app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

//routes
app.get("/", (req, res) => {
  res.send(`
    <h1>School Management System</h1>
    <p>Welcome to the School Management System API</p>
    <p>Available Routes: Click on the links to view the request in postman</p>
    <ul>
        <li><a href="https://business-vishal-haramkar-7525076.postman.co/workspace/Vishal-Haramkar's-Workspace~877f05d8-6b2c-42d5-891a-d2744590a3fc/collection/47464880-0bbf1a37-4675-4627-abe1-2d742a35f3b0?action=share&creator=47464880" target="_blank">POST /addSchool</a> - Add a new school</li>
        <li><a href="https://business-vishal-haramkar-7525076.postman.co/workspace/Vishal-Haramkar's-Workspace~877f05d8-6b2c-42d5-891a-d2744590a3fc/collection/47464880-0bbf1a37-4675-4627-abe1-2d742a35f3b0?action=share&creator=47464880" target="_blank">GET /listSchools</a> - List schools sorted by proximity</li>
    </ul>
    <p>Add School Example:</p>
    <p>Insert the below data in the body of the request</p>


    <pre>
        POST /addSchool
        {
            "name": "ABCD ACADEMY",
            "address": "XYZ Lane, ABC City",
            "latitude": 123.456,
            "longitude": 78.901
        }
    </pre>
    <p>List Schools (sorted by distance) Example:</p>
    <pre>
        GET /listSchools?latitude=123.456&longitude=78.901
    </pre>
    `);
});

app.post("/addSchool", async (req, res) => {
  try {
    let { name, address, latitude, longitude } = req.body;

    if (
      !name ||
      !address ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res
        .status(400)
        .json({ error: "Latitude and Longitude must be valid numbers" });
    }

    const insertQuery =
      "INSERT INTO school_db (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";

    connection.query(
      insertQuery,
      [name, address, latitude, longitude],
      (error, result) => {
        if (error) {
          console.error("Error inserting school:", error);
          return res.status(500).json({ error: "Internal server error" });
        }

        return res.status(201).json({
          message: "School added successfully",
          id: result?.insertId,
          name,
          address,
          latitude,
          longitude,
        });
      }
    );
  } catch (err) {
    console.error("Unhandled error in /addSchool:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/listSchool", async (req, res) => {
  connection.query("SELECT * FROM school_db", (error, result) => {
    if (error) {
      console.log("Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.send(result);
  });
});

app.get("/listSchools", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Query parameters 'latitude' and 'longitude' are required",
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) {
      return res
        .status(400)
        .json({ error: "Latitude and Longitude must be valid numbers" });
    }

    connection.query("SELECT * FROM school_db", (error, rows) => {
      if (error) {
        console.error("Error fetching schools:", error);
        return res.status(500).json({ error: "Internal server error" });
      }

      const sorted = rows
        .map((row) => {
          const schoolLat = parseFloat(row.latitude);
          const schoolLon = parseFloat(row.longitude);
          const distanceKm = calculateDistanceKm(
            userLat,
            userLon,
            schoolLat,
            schoolLon
          );
          return {
            id: row.id,
            name: row.name,
            address: row.address,
            latitude: schoolLat,
            longitude: schoolLon,
            distanceKm,
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return res.json(sorted);
    });
  } catch (err) {
    console.error("Unhandled error in /listSchools:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Haversine distance in kilometers
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helpers
function ensureSchoolTable() {
  const databaseName = process.env.DB_DATABASE;

  const createTableSql = `CREATE TABLE IF NOT EXISTS school_db (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,6) NOT NULL,
    longitude DECIMAL(10,6) NOT NULL,
    PRIMARY KEY (id)
  )`;

  connection.query(createTableSql, (createErr) => {
    if (createErr) {
      console.error("Failed to ensure table exists:", createErr);
      return;
    }

    const columnInfoSql = `SELECT EXTRA, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'school_db' AND COLUMN_NAME = 'id'`;
    connection.query(columnInfoSql, [databaseName], (infoErr, rows) => {
      if (infoErr) {
        console.error("Failed to inspect table column info:", infoErr);
        return;
      }

      const extra = rows && rows[0] ? rows[0].EXTRA || "" : "";
      const columnKey = rows && rows[0] ? rows[0].COLUMN_KEY || "" : "";
      const hasAutoIncrement =
        typeof extra === "string" && extra.includes("auto_increment");
      const hasPrimaryKey = columnKey === "PRI";

      if (!hasAutoIncrement) {
        const addAutoIncSql = `ALTER TABLE school_db MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT`;
        connection.query(addAutoIncSql, (alterErr) => {
          if (alterErr) {
            console.error("Failed to set id AUTO_INCREMENT:", alterErr);
          }
        });
      }

      if (!hasPrimaryKey) {
        const addPkSql = `ALTER TABLE school_db ADD PRIMARY KEY (id)`;
        connection.query(addPkSql, (pkErr) => {
          if (pkErr && pkErr.code !== "ER_MULTIPLE_PRI_KEY") {
            console.error("Failed to add PRIMARY KEY on id:", pkErr);
          }
        });
      }
    });
  });
}
