import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import multer from "multer";

env.config();
const upload = multer();

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

let blog_id;

function changedText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
}

function nonHyphen(text) {
  return text.replace(/-/g, " ");
}

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

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

app.get("/", async (req, res) => {
  let allBlogPosts;

  if (req.isAuthenticated()) {
    res.redirect("/signedin");
  } else {
    try {
      const result = await db.query("SELECT * FROM posts");
      allBlogPosts = result.rows;

      let sliced_text = [];

      for (let i = 0; i < allBlogPosts.length; i++) {
        const { image, image_type } = allBlogPosts[i];

        const base64Image = image.toString("base64");
        const dataUrl = `data:${image_type};base64,${base64Image}`;
        let hyphenBlogTitle = allBlogPosts[i].title;
        allBlogPosts[i].title = capitalizeFirstLetter(allBlogPosts[i].title);
        allBlogPosts[i].title = nonHyphen(allBlogPosts[i].title);
        allBlogPosts[i].content = nonHyphen(allBlogPosts[i].content);

        allBlogPosts[i] = { ...allBlogPosts[i], hyphenBlogTitle, dataUrl };
      }

      console.log("all blog posts below");
      console.log(allBlogPosts);

      res.render("index.ejs", {
        totalBlogs: allBlogPosts,
      });
    } catch (err) {
      console.log(err);
    }
  }
});

app.get("/about", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("about.ejs", { text: "hidden" });
  } else {
    res.render("about.ejs");
  }
});

// app.post("/submitblog", async (req, res) => {
//   let blogPost = req.body;
//   console.log(blogPost);

//   const d = new Date();
//   if (req.isAuthenticated()) {
//     let user = req.user;
//     let hypenatedBlogTitle = changedText(blogPost.blog_title);
//     let hypenatedBlogText = changedText(blogPost.blog_text);
//     let blogAuthorId = req.user.id;

//     //     INSERT INTO table_name (column1, column2, column3, ...)
//     // VALUES (value1, value2, value3, ...);

//     try {
//       const result = await db.query(
//         "INSERT INTO posts (user_id,title,content) VALUES ($1, $2, $3)",
//         [blogAuthorId, hypenatedBlogTitle, hypenatedBlogText]
//       );

//       res.redirect("/");
//     } catch (err) {
//       console.log(err);
//     }
//   } else {
//     res.redirect("/");
//   }
// });

app.post("/submitblog", upload.single("file"), async (req, res) => {
  const { blog_title, blog_text } = req.body;
  const file = req.file;

  console.log("req file and body");
  console.log(req.file);
  console.log(req.body);

  const d = new Date();

  if (req.isAuthenticated()) {
    const userId = req.user.id;
    const hypenatedBlogTitle = changedText(blog_title);
    const hypenatedBlogText = changedText(blog_text);

    try {
      // Insert into DB including image
      const result = await db.query(
        "INSERT INTO posts (user_id, title, content, image, img_name, image_type) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          userId,
          hypenatedBlogTitle,
          hypenatedBlogText,
          file.buffer,
          file.originalname,
          file.mimetype,
        ]
      );

      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Database error");
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

// later feature maybe
// app.get("/likes", (req, res) => {
//   if (req.isAuthenticated()) {
//   } else {
//     res.render("/");
//   }
// });

app.get("/addnew", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("addnew.ejs", { text: "hidden" });
  } else {
    res.redirect("/");
  }
});

app.get("/article/:slug", async (req, res) => {
  let allBlogPosts;

  if (req.isAuthenticated()) {
    const result = await db.query(`SELECT * FROM posts WHERE title = $1`, [
      req.params.slug,
    ]);

    let blog_title = result.rows[0].title;
    let blog_content = result.rows[0].content;
    blog_title = nonHyphen(blog_title);
    blog_title = capitalizeFirstLetter(blog_title);
    blog_content = nonHyphen(blog_content);
    blog_content = capitalizeFirstLetter(blog_content);
    console.log(result.rows);

    res.render("article.ejs", {
      blogTitle: blog_title,
      blogContent: blog_content,
      text: "hidden",
    });
    // res.render("signedin.ejs", { text: "hidden" });
  } else {
    try {
      const result = await db.query(`SELECT * FROM posts WHERE title = $1`, [
        req.params.slug,
      ]);

      let blog_title = result.rows[0].title;
      let blog_content = result.rows[0].content;
      blog_title = nonHyphen(blog_title);
      blog_title = capitalizeFirstLetter(blog_title);
      blog_content = nonHyphen(blog_content);
      blog_content = capitalizeFirstLetter(blog_content);
      console.log(result.rows);

      res.render("article.ejs", {
        blogTitle: blog_title,
        blogContent: blog_content,
      });
    } catch (err) {
      console.log(err);
    }
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

app.get("/signedin", async (req, res) => {
  let allBlogPosts;
  if (req.isAuthenticated()) {
    try {
      const result = await db.query("SELECT * FROM posts");

      allBlogPosts = result.rows;

      // console.log(result.rows);

      for (let i = 0; i < allBlogPosts.length; i++) {
        const { image, image_type } = allBlogPosts[i];

        const base64Image = image.toString("base64");
        const dataUrl = `data:${image_type};base64,${base64Image}`;
        let hyphenBlogTitle = allBlogPosts[i].title;
        allBlogPosts[i].title = capitalizeFirstLetter(allBlogPosts[i].title);
        allBlogPosts[i].title = nonHyphen(allBlogPosts[i].title);
        allBlogPosts[i].content = nonHyphen(allBlogPosts[i].content);

        allBlogPosts[i] = { ...allBlogPosts[i], hyphenBlogTitle, dataUrl };
      }

      console.log("all blog posts below");
      console.log(allBlogPosts);

      res.render("signedin.ejs", {
        totalBlogs: allBlogPosts,
        text: "hidden",
      });
    } catch (err) {
      console.log(err);
    }
    // res.render("signedin.ejs", { text: "hidden" });
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
