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
let naked_image_size;
let hyphen_blog_title;

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
    .replace(/[^\w-.]+/g, "");
}

function nonHyphen(text) {
  return text.replace(/-/g, " ");
}

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function LowercaseFirstLetter(val) {
  return String(val).charAt(0).toLowerCase() + String(val).slice(1);
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

app.post("/submitblog", upload.single("file"), async (req, res) => {
  const { blog_title, blog_text } = req.body;
  let file = req.file;

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

app.post("/submiteditedblog", upload.single("file"), async (req, res) => {
  console.log(req.body);
  const { blog_title, blog_text } = req.body;
  let file = req.file;
  if (file !== undefined) {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const hypenatedBlogTitle = changedText(blog_title);
      const hypenatedBlogText = changedText(blog_text);

      try {
        const result = await db.query(
          "UPDATE posts SET user_id = $1, title = $2, content = $3, image = $4, img_name = $5, image_type = $6 WHERE title = $7",
          [
            userId,
            hypenatedBlogTitle,
            hypenatedBlogText,
            file.buffer,
            file.originalname,
            file.mimetype,
            hyphen_blog_title,
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
  } else {
    //     UPDATE table_name
    // SET column1 = value1, column2 = value2, ...
    // WHERE condition;
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const hypenatedBlogTitle = changedText(blog_title);
      const hypenatedBlogText = changedText(blog_text);

      try {
        // Insert into DB including image
        const result = await db.query(
          "UPDATE posts SET title = $1, content = $2 WHERE title = $3",
          [hypenatedBlogTitle, hypenatedBlogText, hyphen_blog_title]
        );

        res.redirect("/");
      } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
      }
    } else {
      res.redirect("/");
    }
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
    let hyphen_title = result.rows[0].title;
    let blog_content = result.rows[0].content;
    blog_title = nonHyphen(blog_title);
    blog_title = capitalizeFirstLetter(blog_title);
    blog_content = nonHyphen(blog_content);
    blog_content = capitalizeFirstLetter(blog_content);

    res.render("article.ejs", {
      blogTitle: blog_title,
      blogContent: blog_content,
      hyphen_text: hyphen_title,
      text: "hidden",
    });
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

      res.render("article.ejs", {
        blogTitle: blog_title,
        blogContent: blog_content,
      });
    } catch (err) {
      console.log(err);
    }
  }
});

// Cannot GET /article/delete/The%20rise%20of%20ai%20in%20everyday%20life

app.get("/article/edit/:slug", async (req, res) => {
  req.params.slug = LowercaseFirstLetter(req.params.slug);
  req.params.slug = changedText(req.params.slug);

  try {
    const result_1 = await db.query(`SELECT * FROM posts WHERE title = $1`, [
      req.params.slug,
    ]);

    naked_image_size = result_1.rows[0].image;

    const result_2 = await db.query(`SELECT * FROM users WHERE id = $1`, [
      result_1.rows[0].user_id,
    ]);

    let blog_title = result_1.rows[0].title;
    hyphen_blog_title = result_1.rows[0].title;
    let blog_text = result_1.rows[0].content;

    blog_title = capitalizeFirstLetter(blog_title);
    blog_title = nonHyphen(blog_title);
    blog_text = capitalizeFirstLetter(blog_text);
    blog_text = nonHyphen(blog_text);
    let author_email = result_2.rows[0].email;
    res.render("editblog.ejs", {
      text: "hidden",
      article_title: blog_title,
      article_text: blog_text,
      article_author: author_email,
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/article/delete/:slug", async (req, res) => {
  req.params.slug = LowercaseFirstLetter(req.params.slug);
  req.params.slug = changedText(req.params.slug);

  // DELETE FROM table_name WHERE condition;

  try {
    const result_1 = await db.query(`DELETE FROM posts WHERE title = $1`, [
      req.params.slug,
    ]);

    res.redirect("/");
  } catch (err) {
    console.log(err);
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

      res.render("signedin.ejs", {
        totalBlogs: allBlogPosts,
        text: "hidden",
      });
    } catch (err) {
      console.log(err);
    }
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
      callbackURL: "https:/ucheklinks.com/auth/google/signedin",
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
