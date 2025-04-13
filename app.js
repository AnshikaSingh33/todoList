const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const date = require(__dirname + "/date.js"); // Optional if not used in rendering
const app = express();
const _=require('lodash');
const cors=require("cors");
app.use(cors({
  origin: ["https://deploy-todolist.vercel.app"],
  methods: ["POST", "GET"],
  credentials: true
}));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Favicon fix: prevent favicon.ico from being treated as a list
app.get("/favicon.ico", (req, res) => res.status(204).end());

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb+srv://admin-anshika:ToDo123@cluster0.crnkllk.mongodb.net/todolistDB?retryWrites=true&w=majority&appName=Cluster0');
  console.log("Connected to MongoDB");
}
// MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/todolistDB")
//   .then(() => console.log("Connected to MongoDB"))
//   .catch(err => console.error("MongoDB connection error:", err));

// Schemas
const itemsSchema = {
  name: String
};
const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema]
};
const List = mongoose.model("List", listSchema);

// Default items
const defaultItems = [
  { name: "Welcome to your ToDo List." },
  { name: "Hit the + button to add a new item." },
  { name: "<-- Hit this to delete an item." },
];

// Function to initialize defaults
async function initializeItems() {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      await Item.insertMany(defaultItems);
      console.log("Inserted default items");
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error during initialization:", err);
    return false;
  }
}

// Route: Home
app.get("/", async (req, res) => {
  try {
    let items = await Item.find({});
    if (items.length === 0) {
      await initializeItems();
      items = await Item.find({});
    }
    res.render("list", { listTitle: "Today", newListItems: items });
  } catch (err) {
    console.error("Error in GET /:", err.message);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/about", (req, res) => {
  res.render("about");
});

// Route: Custom list
app.get("/:customListName", async (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      await list.save();
      console.log(`Created new list: ${customListName}`);
      res.redirect("/" + customListName);
    } else {
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items
      });
    }
  } catch (err) {
    console.error("Error in custom list GET:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Route: Add new item
app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({ name: itemName });

  try {
    if (listName.toLowerCase() === "today") {
      await item.save();
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      } else {
        console.error("List not found to add item.");
        res.redirect("/");
      }
    }
  } catch (err) {
    console.error("Error adding item:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Route: Delete item
app.post("/delete", async (req, res) => {
  const itemId = req.body.checkbox;
  const listName = req.body.listName;

  try {
    if (listName.toLowerCase() === "today") {
      await Item.findByIdAndDelete(itemId);
      res.redirect("/");
    } else {
      await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: itemId } } }
      );
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.error("Error deleting item:", err.message);
    res.status(500).send("Internal Server Error");
  }
});


// Server start
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});