import NumberList from "../models/NumberList.js";
import SubscriptionService from "../services/SubscriptionService.js";
import { sendSubscriptionError } from "../utils/subscription.js";
import { executeProviderIdempotentRequest } from "../services/ProviderRequestIdempotencyService.js";
import mongoose from "mongoose";

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-teal-500",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const MAX_NUMBERS_PER_LIST = 50_000;
const MAX_CONTACT_DATA_BYTES = 8 * 1024 * 1024;

function inputError(message, code = "NUMBER_LIST_INPUT_INVALID") {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
}

function validId(value) {
  if (!mongoose.Types.ObjectId.isValid(String(value || ""))) {
    throw inputError("Number list ID is invalid", "NUMBER_LIST_ID_INVALID");
  }
  return String(value);
}

function cleanName(value, label = "name") {
  const name = String(value || "").trim();
  if (!name || name.length > 120) throw inputError(`${label} must be between 1 and 120 characters`);
  return name;
}

function cleanStringArray(value, label, maxItems, maxLength) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw inputError(`${label} must contain at most ${maxItems} items`);
  }
  const output = value.map((item) => String(item || "").trim());
  if (output.some((item) => !item || item.length > maxLength)) {
    throw inputError(`${label} contains an invalid value`);
  }
  return [...new Set(output)];
}

function cleanNumbers(value) {
  const numbers = cleanStringArray(value, "numbers", MAX_NUMBERS_PER_LIST, 32);
  if (numbers.some((number) => {
    const digits = number.replace(/\D/g, "");
    return digits.length < 7 || digits.length > 15;
  })) throw inputError("Each phone number must contain 7 to 15 digits", "NUMBER_LIST_PHONE_INVALID");
  return numbers;
}

function cleanContactData(value) {
  if (!Array.isArray(value) || value.length > MAX_NUMBERS_PER_LIST) {
    throw inputError(`contactData must contain at most ${MAX_NUMBERS_PER_LIST} rows`);
  }
  const rows = value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).length > 50) {
      throw inputError("Each contactData row must be an object with at most 50 fields");
    }
    return Object.fromEntries(Object.entries(row).map(([rawKey, rawValue]) => {
      const key = String(rawKey).trim();
      if (!key || key.length > 80 || !/^[a-z0-9 _.-]+$/i.test(key)) throw inputError("contactData contains an invalid field name");
      if (rawValue !== null && !["string", "number", "boolean"].includes(typeof rawValue)) throw inputError(`contactData field ${key} has an invalid value`);
      const normalized = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      if (typeof normalized === "string" && normalized.length > 1_000) throw inputError(`contactData field ${key} is too long`);
      return [key, normalized];
    }));
  });
  if (Buffer.byteLength(JSON.stringify(rows), "utf8") > MAX_CONTACT_DATA_BYTES) {
    throw inputError("contactData exceeds the 8 MB request limit", "NUMBER_LIST_CONTACT_DATA_TOO_LARGE");
  }
  return rows;
}

function cleanListPayload(body, { partial = false } = {}) {
  const output = {};
  if (!partial || body.name !== undefined) output.name = cleanName(body.name);
  if (!partial || body.numbers !== undefined) output.numbers = cleanNumbers(body.numbers || []);
  if (!partial || body.tags !== undefined) output.tags = cleanStringArray(body.tags || [], "tags", 50, 80);
  if (!partial || body.variables !== undefined) output.variables = cleanStringArray(body.variables || [], "variables", 50, 80);
  if (!partial || body.contactData !== undefined) output.contactData = cleanContactData(body.contactData || []);
  if (!partial || body.color !== undefined) {
    if (body.color && !COLORS.includes(String(body.color))) throw inputError("color is not supported");
    output.color = body.color ? String(body.color) : undefined;
  }
  if (partial && !Object.keys(output).length) throw inputError("Provide at least one list field to update");
  return output;
}

function formatList(list) {
  return {
    id: list._id.toString(),
    name: list.name,
    count: list.numbers.length,
    numbers: list.numbers,
    tags: list.tags,
    color: list.color,
    variables: list.variables || [],
    contactData: list.contactData || [],
    created: list.createdAt ? list.createdAt.toISOString().slice(0, 10) : null,
  };
}

export const getLists = async (req, res) => {
  try {
    const lists = await NumberList.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    const formattedLists = lists.map(formatList);
    res.json({ lists: formattedLists });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createList = async (req, res) => {
  try {
    const { name, numbers, tags, color, variables, contactData } = cleanListPayload(req.body || {});

    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId: "number-lists",
      chatJid: String(name).trim(),
      idempotencyKey:
        req.get("Idempotency-Key") || req.body.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "number_list_create",
      payload: { name, numbers, tags, color, variables, contactData },
      execute: async () => {
        await SubscriptionService.assertResourceLimit(req.user, "numberLists", 1);
        const list = await NumberList.create({
          userId: req.user._id,
          name,
          numbers,
          tags,
          color: color || randomColor(),
          variables,
          contactData,
        });
        return { list: formatList(list) };
      },
    });
    res
      .status(handled.duplicate ? 200 : 201)
      .json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to create list");
  }
};

export const getList = async (req, res) => {
  try {
    validId(req.params.id);
    const list = await NumberList.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!list) return res.status(404).json({ error: "List not found" });
    res.json({ list: formatList(list) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ code: err.code, error: err.message });
  }
};

export const updateList = async (req, res) => {
  try {
    validId(req.params.id);
    const update = cleanListPayload(req.body || {}, { partial: true });
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId: "number-lists",
      chatJid: req.params.id,
      idempotencyKey: req.get("Idempotency-Key"),
      requireKey: req.authMode === "api-key",
      requestType: "number_list_update",
      payload: update,
      execute: async () => {
        const list = await NumberList.findOneAndUpdate(
          { _id: req.params.id, userId: req.user._id },
          update,
          { new: true },
        );
        if (!list) {
          const error = new Error("List not found");
          error.statusCode = 404;
          error.code = "NUMBER_LIST_NOT_FOUND";
          throw error;
        }
        return { list: formatList(list) };
      },
    });
    res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to update list");
  }
};

export const deleteList = async (req, res) => {
  try {
    validId(req.params.id);
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId: "number-lists",
      chatJid: req.params.id,
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "number_list_delete",
      payload: { listId: req.params.id },
      execute: async () => {
        const list = await NumberList.findOneAndDelete({
          _id: req.params.id,
          userId: req.user._id,
        });
        if (!list) {
          const error = new Error("List not found");
          error.statusCode = 404;
          error.code = "NUMBER_LIST_NOT_FOUND";
          throw error;
        }
        return { success: true, message: "List deleted" };
      },
    });
    res.json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to delete list");
  }
};

export const duplicateList = async (req, res) => {
  try {
    validId(req.params.id);
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId: "number-lists",
      chatJid: req.params.id,
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "number_list_duplicate",
      payload: { listId: req.params.id },
      execute: async () => {
        const original = await NumberList.findOne({
          _id: req.params.id,
          userId: req.user._id,
        });
        if (!original) {
          const error = new Error("List not found");
          error.statusCode = 404;
          error.code = "NUMBER_LIST_NOT_FOUND";
          throw error;
        }
        await SubscriptionService.assertResourceLimit(
          req.user,
          "numberLists",
          1,
        );
        const copy = await NumberList.create({
          userId: req.user._id,
          name: `${original.name} (copy)`,
          numbers: [...original.numbers],
          tags: [...original.tags],
          color: original.color,
          variables: [...(original.variables || [])],
          contactData: [...(original.contactData || [])],
        });
        return { list: formatList(copy) };
      },
    });
    res
      .status(handled.duplicate ? 200 : 201)
      .json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to duplicate list");
  }
};

export const mergeLists = async (req, res) => {
  try {
    const { name, listIds } = req.body;
    if (!Array.isArray(listIds) || listIds.length < 2 || listIds.length > 100)
      return res.status(400).json({ error: "At least 2 list IDs required" });
    const uniqueListIds = [...new Set(listIds.map(String))];
    if (uniqueListIds.length < 2) {
      return res.status(400).json({ error: "At least 2 unique list IDs required" });
    }
    uniqueListIds.forEach(validId);
    const mergedName = name ? cleanName(name) : "Merged List";
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId: "number-lists",
      chatJid: "merge",
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "number_list_merge",
      payload: { name: mergedName, listIds: uniqueListIds },
      execute: async () => {
        const sourceLists = await NumberList.find({
          _id: { $in: uniqueListIds },
          userId: req.user._id,
        });
        if (sourceLists.length !== uniqueListIds.length) {
          const error = new Error("One or more number lists were not found");
          error.statusCode = 404;
          error.code = "NUMBER_LIST_NOT_FOUND";
          throw error;
        }
        await SubscriptionService.assertResourceLimit(
          req.user,
          "numberLists",
          1,
        );
        const allNumbers = [...new Set(sourceLists.flatMap((list) => list.numbers))];
        const merged = await NumberList.create({
          userId: req.user._id,
          name: mergedName,
          numbers: allNumbers,
          tags: ["merged"],
          color: "bg-cyan-500",
        });
        return { list: formatList(merged) };
      },
    });
    res
      .status(handled.duplicate ? 200 : 201)
      .json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to merge lists");
  }
};

export const filterList = async (req, res) => {
  try {
    validId(req.params.id);
    const {
      saveName,
      countryCode,
      numberFormat,
      removeDupes,
      addCountryCode,
      addToMissing,
    } = req.body;
    const payload = {
      saveName: saveName ? cleanName(saveName, "saveName") : null,
      countryCode: countryCode ? String(countryCode).trim().slice(0, 8) : null,
      numberFormat: numberFormat || null,
      removeDupes: Boolean(removeDupes),
      addCountryCode: addCountryCode || null,
      addToMissing: Boolean(addToMissing),
    };
    if (payload.numberFormat && !["international", "local"].includes(payload.numberFormat)) throw inputError("numberFormat must be international or local");
    if (payload.countryCode && !/^\+?\d{1,7}$/.test(payload.countryCode)) throw inputError("countryCode is invalid");
    if (payload.addCountryCode && !/^\+?\d{1,7}$/.test(String(payload.addCountryCode))) throw inputError("addCountryCode is invalid");
    const handled = await executeProviderIdempotentRequest({
      userId: req.user._id,
      sessionId: "number-lists",
      chatJid: req.params.id,
      idempotencyKey:
        req.get("Idempotency-Key") || req.body?.clientRequestId,
      requireKey: req.authMode === "api-key",
      requestType: "number_list_filter",
      payload,
      execute: async () => {
        const original = await NumberList.findOne({
          _id: req.params.id,
          userId: req.user._id,
        });
        if (!original) {
          const error = new Error("List not found");
          error.statusCode = 404;
          error.code = "NUMBER_LIST_NOT_FOUND";
          throw error;
        }
        await SubscriptionService.assertResourceLimit(
          req.user,
          "numberLists",
          1,
        );
        let numbers = [...original.numbers];
        if (addCountryCode && addToMissing) {
          const codeDigits = String(addCountryCode).replace(/\D/g, "");
          numbers = numbers.map((number) => {
            const digits = number.replace(/\D/g, "");
            return digits.startsWith(codeDigits)
              ? number
              : `${addCountryCode}${digits}`;
          });
        }
        if (countryCode) {
          const codeDigits = String(countryCode).replace(/\D/g, "");
          numbers = numbers.filter((number) =>
            number.replace(/\D/g, "").startsWith(codeDigits),
          );
        }
        if (numberFormat === "international") {
          numbers = numbers.filter((number) => number.startsWith("+"));
        } else if (numberFormat === "local") {
          numbers = numbers.filter((number) => !number.startsWith("+"));
        }
        if (removeDupes) numbers = [...new Set(numbers)];
        const filtered = await NumberList.create({
          userId: req.user._id,
          name: payload.saveName || cleanName(`Filtered — ${original.name}`),
          numbers,
          tags: ["filtered"],
          color: "bg-teal-500",
        });
        return { list: formatList(filtered) };
      },
    });
    res
      .status(handled.duplicate ? 200 : 201)
      .json({ ...handled.response, duplicate: handled.duplicate });
  } catch (err) {
    return sendSubscriptionError(res, err, "Failed to filter list");
  }
};

export default {
  getLists,
  createList,
  getList,
  updateList,
  deleteList,
  duplicateList,
  mergeLists,
  filterList,
};
