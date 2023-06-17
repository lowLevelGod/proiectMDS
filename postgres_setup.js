const { Client } = require("pg");

const pgclient = new Client({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: "postgres",
  password: "postgres",
  database: "postgres",
});

pgclient.connect();

const user = `CREATE ROLE brontosaur WITH
LOGIN
NOSUPERUSER
INHERIT
CREATEDB
NOCREATEROLE
NOREPLICATION
PASSWORD '1234'`;
const database = `
CREATE DATABASE dbMDS
OWNER brontosaur
TABLESPACE pg_default
`;

const table = `CREATE TABLE Users (
    id text COLLATE pg_catalog.default NOT NULL,
    email text COLLATE pg_catalog.default NOT NULL,
    passwordHash text COLLATE pg_catalog.default NOT NULL,
    CONSTRAINT User_pkey PRIMARY KEY (id) 
    )`;

pgclient.query(user, (err, res) => {
  if (err) {
    console.log(err);
    throw err;
  }
  pgclient.query(database, (err, res) => {
    if (err) {
      console.log(err);
      throw err;
    }
    pgclient.query(table, (err, res) => {
      if (err) {
        console.log(err);
        throw err;
      }
      pgclient.end();
    });
  });
});
