
const { Router } = require("express");

const router = Router();

router.get("/", (req, res) => {
  res.send("watchRoom backend is running!");
});

module.exports =  router;
