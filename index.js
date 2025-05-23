import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import flowbite from "flowbite";

env.config();

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let blog_title;
let date;
let likes;
let views;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    blog_title = "";
    date = "";
    likes = "";
    views = "";
    res.render("signedin.ejs", { text: "hidden" });
  } else {
    res.render("index.ejs");
  }
});

app.get("/about", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("about.ejs", { text: "hidden" });
  } else {
    res.render("about.ejs");
  }
});

app.post("/submitblog", async (req, res) => {
  let blogPost = req.body;
  console.log(blogPost);

  const d = new Date();
  if (req.isAuthenticated()) {
    let user = req.user;

    //     INSERT INTO table_name (column1, column2, column3, ...)
    // VALUES (value1, value2, value3, ...);

    try {
     
      

      console.log(result.rows);
    } catch (err) {
      return err;
    }
  } else {
    res.redirect("/");
  }
});

app.get("/contact", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("contact.ejs", { text: "hidden" });
  } else {
    res.render("contact.ejs");
  }
});

app.get("/addnew", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("addnew.ejs", { text: "hidden" });
  } else {
    res.redirect("/");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

app.get(
  "/auth/google/signedin",
  passport.authenticate("google", {
    successRedirect: "/signedin",
    failureRedirect: "/",
  })
);

app.get("/signedin", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("signedin.ejs", { text: "hidden" });
  } else {
    res.redirect("/");
  }
});

app.get("/logout", async (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/signedin",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        // console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// https://www.awwwards.com/inspiration/blog-page-muse
