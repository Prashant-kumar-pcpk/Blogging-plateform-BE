const Category = require("../models/Category");
const Tag = require("../models/Tag");
const slugify = require("../utils/slugify");

const createTaxonomyHandlers = (Model) => ({
  list: async (req, res) => {
    const items = await Model.find().sort({ name: 1 });
    res.json(items);
  },
  create: async (req, res) => {
    const { name, description, color } = req.body;

    if (!name) {
      res.status(400);
      throw new Error("Name is required");
    }

    const item = await Model.create({
      name,
      slug: slugify(name),
      description,
      color,
    });

    res.status(201).json(item);
  },
  update: async (req, res) => {
    const item = await Model.findById(req.params.id);

    if (!item) {
      res.status(404);
      throw new Error("Item not found");
    }

    item.name = req.body.name ?? item.name;
    item.slug = slugify(item.name);
    item.description = req.body.description ?? item.description;
    if ("color" in req.body) {
      item.color = req.body.color;
    }

    await item.save();
    res.json(item);
  },
  remove: async (req, res) => {
    const item = await Model.findById(req.params.id);

    if (!item) {
      res.status(404);
      throw new Error("Item not found");
    }

    await item.deleteOne();
    res.json({ message: "Deleted successfully" });
  },
});

module.exports = {
  categoryController: createTaxonomyHandlers(Category),
  tagController: createTaxonomyHandlers(Tag),
};
