# persistent_blog

issues encountered:

1article.ejs not showing tailwind styling despite using the same partials as other webpages

1a----non-working route combo front end and backend

 <a href="article/<%=locals.totalBlogs[i].hyphenBlogTitle%>">
        <p class="italic"><%= locals.totalBlogs[i].title%></p></a
      >

app.get("/article/:slug", async(req, res) => {
if (req.isAuthenticated()) {
res.render("article.ejs", { text: "hidden" });
} else {
res.render("article.ejs");
}
});

-1b----- working route combo

   <a href="<%=locals.totalBlogs[i].hyphenBlogTitle%>">
        <p class="italic"><%= locals.totalBlogs[i].title%></p></a
      >

         <a href="<%=locals.totalBlogs[i].hyphenBlogTitle%>">
        <p class="italic"><%= locals.totalBlogs[i].title%></p></a
      >


2. hamburger menu shenaanigans

