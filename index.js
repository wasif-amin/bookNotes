import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();
const adminLoginRoute = process.env.ADMIN_LOGIN_ROUTE;
const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booknotes",
  password: "21070212w",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "TOPSECRETWORD",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

async function bookCover(isbn) {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await axios.get(url);
    const bookData = response.data[`ISBN:${isbn}`];
    const coverUrl = bookData.cover ? bookData.cover.large : null;
    if (bookData && bookData.cover) {
      return coverUrl;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Failed to make request:", error.message);
    return null;
  }
}
app.get(adminLoginRoute, (req, res) => {
  req.session.isAdmin = true;
  res.send("<h1>You are now logged in !</h1><a href='/'>Go to Home</a>");
});
function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  res.status(403).send("Unauthorized: Only Wasif can modify these book notes.");
}
app.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM books ORDER BY id ASC ");
  const entries = result.rows;
  res.render("index.ejs", {
    entries: entries,
    isAdmin: req.session.isAdmin || false,
  });
});
app.get("/compose", isAdmin, (req, res) => {
  res.render("compose.ejs");
});
app.get("/login", (req, res) => {
  res.render("login.ejs");
});
app.post("/new", isAdmin, async (req, res) => {
  const title = req.body.title;
  const description = req.body.description;
  const rating = req.body.rating;
  const isbn = req.body.isbn;
  try {
    await db.query(
      "INSERT INTO books (title, description, rating, isbn) VALUES ($1, $2, $3, $4)",
      [title, description, rating, isbn]
    );
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});
app.post("/delete", isAdmin, async (req, res) => {
  const id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});
app.get("/edit/:id", isAdmin, async (req, res) => {
  const id = req.params.id;
  const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
  const entry = result.rows[0];
  res.render("edit.ejs", { book: entry });
});
app.post("/edit", async (req, res) => {
  const id = req.body.id;
  const title = req.body.updatedTitle;
  const rating = req.body.updatedRating;
  const isbn = req.body.updated_isbn;
  const description = req.body.description;

  try {
    await db.query(
      "UPDATE books SET title = $1, rating = $2, description = $3, isbn = $4 WHERE id = $5",
      [title, rating, description, isbn, id]
    );
    res.redirect("/");
  } catch (err) {
    console.log("Error updating database:", err);
    res.status(500).send("Database update failed.");
  }
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
