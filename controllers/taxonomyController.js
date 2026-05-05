const Category = require("../models/Category");
const Tag = require("../models/Tag");
const slugify = require("../utils/slugify");

const normalizeName = (name = "") => String(name).trim();
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createTaxonomyHandlers = (Model) => ({
  list: async (req, res) => {
    const items = await Model.find().sort({ name: 1 });
    res.json(items);
  },
  create: async (req, res) => {
    const name = normalizeName(req.body.name);
    const description = String(req.body.description || "").trim();
    const color = req.body.color;

    if (!name) {
      res.status(400);
      throw new Error("Name is required");
    }

    const existingItem = await Model.findOne({
      $or: [{ name: new RegExp(`^${escapeRegex(name)}$`, "i") }, { slug: slugify(name) }],
    });

    if (existingItem) {
      res.status(409);
      throw new Error(`${Model.modelName} already exists`);
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

    const nextName = normalizeName(req.body.name ?? item.name);
    if (!nextName) {
      res.status(400);
      throw new Error("Name is required");
    }

    const duplicate = await Model.findOne({
      _id: { $ne: item._id },
      $or: [{ name: new RegExp(`^${escapeRegex(nextName)}$`, "i") }, { slug: slugify(nextName) }],
    });

    if (duplicate) {
      res.status(409);
      throw new Error(`${Model.modelName} already exists`);
    }

    item.name = nextName;
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
