import { WhatsAppSession } from "../models/index.js";
import NumberList from "../models/NumberList.js";
import WhatsAppService from "../services/WhatsAppService.js";
import mongoose from "mongoose";
import SubscriptionService from "../services/SubscriptionService.js";
import { sendSubscriptionError } from "../utils/subscription.js";

// ─── Constants ───────────────────────────────────────────────────────────────
const GROUP_LIST_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-teal-500",
];
const EXPORT_BRAND_NAME = "WhatsApp Campaign";
const EXPORT_BRAND_TAGLINE = "Group contact export";

// ─── Utilities ───────────────────────────────────────────────────────────────
function randomGroupListColor() {
  return GROUP_LIST_COLORS[
    Math.floor(Math.random() * GROUP_LIST_COLORS.length)
  ];
}

function sanitizeFileName(value) {
  return (
    String(value || "group")
      .replace(/[^a-z0-9-_]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "group"
  );
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatExportDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(date);
}

function normalizeParticipantRole(admin, fallbackRole = "") {
  const role = String(admin || fallbackRole || "")
    .trim()
    .toLowerCase();
  if (role === "superadmin") return "Super Admin";
  if (role === "super admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Member";
}

function getPhoneNumberParticipants(group) {
  const seen = new Set();
  const participants = (
    Array.isArray(group?.participants) ? group.participants : []
  )
    .map((p) => ({
      name: String(p?.name || "").trim(),
      phoneNumber: String(p?.phoneNumber || "").replace(/\D/g, ""),
      role: normalizeParticipantRole(p?.admin, p?.role),
    }))
    .filter((p) => {
      if (
        p.phoneNumber.length < 7 ||
        p.phoneNumber.length > 16 ||
        seen.has(p.phoneNumber)
      )
        return false;
      seen.add(p.phoneNumber);
      return true;
    });

  return participants.map((p, i) => ({
    ...p,
    name: p.name || `Contact ${String(i + 1).padStart(3, "0")}`,
  }));
}

function buildParticipantsCsv(group) {
  const rows = [["Name", "Phone Number", "Role"]];
  getPhoneNumberParticipants(group).forEach((p) => {
    rows.push([p.name, p.phoneNumber, p.role]);
  });
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

function escapeXml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeDocParagraph(text, options = {}) {
  const bold = options.bold ? "<w:b/>" : "";
  const size = options.size ? `<w:sz w:val="${options.size}"/>` : "";
  return `<w:p><w:r><w:rPr>${bold}${size}</w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

function makeDocCell(text, options = {}) {
  const width = options.width || 3000;
  const fill = options.fill ? `<w:shd w:fill="${options.fill}"/>` : "";
  const bold = options.bold ? "<w:b/>" : "";
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill}</w:tcPr><w:p><w:r><w:rPr>${bold}</w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
}

function makeDocRow(cells) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach(({ name, content }) => {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(centralOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endRecord]);
}

function buildParticipantsDoc(group) {
  const participants = getPhoneNumberParticipants(group);
  const generatedAt = formatExportDate();
  const rows = [
    makeDocRow([
      makeDocCell("Name", { width: 3600, bold: true, fill: "EEF2FF" }),
      makeDocCell("Phone Number", { width: 3000, bold: true, fill: "EEF2FF" }),
      makeDocCell("Role", { width: 2200, bold: true, fill: "EEF2FF" }),
    ]),
    ...participants.map((p) =>
      makeDocRow([
        makeDocCell(p.name, { width: 3600 }),
        makeDocCell(p.phoneNumber, { width: 3000 }),
        makeDocCell(p.role, { width: 2200 }),
      ]),
    ),
  ].join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${makeDocParagraph(EXPORT_BRAND_NAME, { bold: true, size: 22 })}
    ${makeDocParagraph(group.subject || "Group", { bold: true, size: 34 })}
    ${makeDocParagraph(`${EXPORT_BRAND_TAGLINE} | Generated ${generatedAt}`, { size: 20 })}
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="4" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      ${rows}
    </w:tbl>
    ${makeDocParagraph(`Generated by ${EXPORT_BRAND_NAME}`, { size: 18 })}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="450" w:footer="450" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return makeZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    {
      name: "word/document.xml",
      content: documentXml,
    },
  ]);
}

function escapePdfText(v) {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "");
}
function truncatePdfText(v, max) {
  const t = String(v ?? "");
  return t.length <= max ? t : `${t.slice(0, Math.max(max - 3, 0))}...`;
}
function pdfText(v, x, y, size = 10, font = "F1", color = "0.07 0.09 0.15") {
  return `BT\n${color} rg\n/${font} ${size} Tf\n${x} ${y} Td\n(${escapePdfText(v)}) Tj\nET`;
}
function pdfRect(x, y, w, h, color) {
  return `q\n${color} rg\n${x} ${y} ${w} ${h} re f\nQ`;
}
function pdfLine(x1, y1, x2, y2, color = "0.89 0.91 0.94", width = 0.5) {
  return `q\n${color} RG\n${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS\nQ`;
}

function buildParticipantsPdf(group) {
  const participants = getPhoneNumberParticipants(group);
  const generatedAt = formatExportDate();
  const rowsPerPage = 28;
  const pages = [];
  for (let i = 0; i < participants.length; i += rowsPerPage)
    pages.push(participants.slice(i, i + rowsPerPage));
  if (!pages.length) pages.push([]);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  const pageObjectNumbers = [];
  pages.forEach((pageRows, pageIndex) => {
    const rowStartY = 570;
    const rowHeight = 18;
    const commands = [
      pdfRect(0, 778, 595, 64, "0.02 0.24 0.18"),
      pdfRect(0, 774, 595, 4, "0.06 0.73 0.51"),
      pdfText(EXPORT_BRAND_NAME, 40, 811, 11, "F2", "0.40 0.95 0.70"),
      pdfText(
        truncatePdfText(group.subject || "Group", 54),
        40,
        788,
        22,
        "F2",
        "1 1 1",
      ),
      pdfText(EXPORT_BRAND_TAGLINE, 400, 812, 9, "F1", "0.65 0.88 0.80"),
      pdfRect(0, 680, 595, 88, "0.97 0.99 0.97"),
      pdfLine(0, 680, 595, 680, "0.86 0.96 0.88"),
      pdfText("CONTACTS", 42, 736, 8, "F2", "0.40 0.55 0.45"),
      pdfText(String(participants.length), 42, 710, 22, "F2", "0.02 0.24 0.18"),
      pdfText("GENERATED", 210, 736, 8, "F2", "0.40 0.55 0.45"),
      pdfText(generatedAt, 210, 712, 11, "F2", "0.02 0.24 0.18"),
      pdfText("COLUMNS", 420, 736, 8, "F2", "0.40 0.55 0.45"),
      pdfText("Name  ·  Phone Number  ·  Role", 420, 712, 10, "F1", "0.02 0.24 0.18"),
      pdfRect(40, 603, 515, 24, "0.90 0.97 0.92"),
      pdfText("Name", 54, 612, 9, "F2", "0.15 0.30 0.20"),
      pdfText("Phone Number", 270, 612, 9, "F2", "0.15 0.30 0.20"),
      pdfText("Role", 440, 612, 9, "F2", "0.15 0.30 0.20"),
    ];

    pageRows.forEach((p, ri) => {
      const y = rowStartY - ri * rowHeight;
      if (ri % 2 === 0)
        commands.push(pdfRect(40, y - 5, 515, rowHeight, "0.97 1 0.97"));
      commands.push(pdfLine(40, y - 6, 555, y - 6));
      commands.push(pdfText(truncatePdfText(p.name, 32), 54, y, 9, "F1"));
      commands.push(pdfText(p.phoneNumber, 270, y, 9, "F1"));
      commands.push(pdfText(p.role, 440, y, 9, "F2", "0.06 0.47 0.35"));
    });

    commands.push(pdfLine(40, 60, 555, 60));
    commands.push(
      pdfText(
        `${EXPORT_BRAND_NAME}  ·  Group contact export`,
        40,
        42,
        8,
        "F1",
        "0.60 0.65 0.62",
      ),
    );
    commands.push(
      pdfText(
        `Page ${pageIndex + 1} of ${pages.length}`,
        490,
        42,
        8,
        "F1",
        "0.60 0.65 0.62",
      ),
    );

    const content = commands.join("\n");
    const contentObjNum = objects.length + 1;
    const byteLen = new TextEncoder().encode(content).length;
    objects.push(`<< /Length ${byteLen} >>\nstream\n${content}\nendstream`);
    const pageObjNum = objects.length + 1;
    pageObjectNumbers.push(pageObjNum);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`,
    );
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${offsets.length - 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function formatImportedList(list) {
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

export const createSession = async (req, res) => {
  try {
    const { name, enableChatView = false, chatPasscode = "" } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Session name is required" });
    }

    if (enableChatView && String(chatPasscode).length < 4) {
      return res
        .status(400)
        .json({ error: "Chat passcode must be at least 4 characters" });
    }

    await SubscriptionService.assertResourceLimit(req.user, "sessions", 1);

    console.log("Creating session for user:", req.user?._id, "name:", name);
    const result = await WhatsAppService.createSession(req.user._id, name, {
      enableChatView: !!enableChatView,
      chatPasscode: String(chatPasscode || ""),
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Create session error:", err);
    return sendSubscriptionError(res, err, "Failed to create session");
  }
};

export const listSessions = async (req, res) => {
  try {
    const sessions = await WhatsAppSession.find({ userId: req.user._id })
      .select("-credentials")
      .sort({ createdAt: -1 });

    await Promise.all(
      sessions.map((session) => {
        if (
          !["connected", "connecting", "disconnected"].includes(session.status)
        ) {
          return Promise.resolve();
        }

        return WhatsAppService.ensureSessionRecovery(
          session.sessionId,
          "list_sessions",
        ).catch(() => null);
      }),
    );

    const sessionsWithStatus = sessions.map((session) => {
      const liveSession = WhatsAppService.getLiveSessionSnapshot(session);

      return {
        _id: session._id,
        sessionId: session.sessionId,
        name: session.name,
        status: liveSession?.status || session.status,
        phone: liveSession?.phoneNumber || session.phoneNumber,
        phoneNumber: liveSession?.phoneNumber || session.phoneNumber,
        chatViewEnabled: !!session.chatViewEnabled,
        lastConnected: liveSession?.lastConnected || session.lastConnected,
        createdAt: session.createdAt,
      };
    });

    res.json({ success: true, data: sessionsWithStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    }).select("-credentials");

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const liveSession = WhatsAppService.getLiveSessionSnapshot(session);

    res.json({
      sessionId: session.sessionId,
      name: session.name,
      status: liveSession?.status || session.status,
      phoneNumber: liveSession?.phoneNumber || session.phoneNumber,
      chatViewEnabled: !!session.chatViewEnabled,
      lastConnected: liveSession?.lastConnected || session.lastConnected,
      createdAt: session.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await WhatsAppService.deleteSession(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSessionQR = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Try to get QR code immediately
    let qrCode = WhatsAppService.getPendingQR(id);

    // If QR code is not immediately available, wait for it (max 5 seconds)
    // This handles the race condition where QR generation is async
    if (!qrCode) {
      const maxWaitTime = 5000; // 5 seconds max
      const checkInterval = 100; // Check every 100ms
      let waited = 0;

      while (!qrCode && waited < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waited += checkInterval;
        qrCode = WhatsAppService.getPendingQR(id);
      }
    }

    if (!qrCode) {
      return res.status(404).json({ error: "QR code not available" });
    }

    res.json({ qr: qrCode, sessionId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSessionGroups = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    }).select("-credentials");

    if (!session) {
      return res.status(404).json({
        success: false,
        code: "SESSION_NOT_FOUND",
        error: "Session not found",
      });
    }

    const groups = await WhatsAppService.getSessionGroups(id);

    return res.json({
      success: true,
      sessionId: id,
      count: groups.length,
      data: groups,
    });
  } catch (err) {
    const statusCode = err.statusCode || err.status || 500;
    return res.status(statusCode).json({
      success: false,
      code: err.code || undefined,
      error: err.message || "Failed to load groups",
    });
  }
};

export const getGroupParticipants = async (req, res) => {
  try {
    const { id, groupJid } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    }).select("-credentials");

    if (!session) {
      return res.status(404).json({
        success: false,
        code: "SESSION_NOT_FOUND",
        error: "Session not found",
      });
    }

    const group = await WhatsAppService.getGroupParticipants(id, groupJid);

    return res.json({
      success: true,
      sessionId: id,
      data: {
        ...group,
        count: group.participants.length,
        phoneNumberCount: getPhoneNumberParticipants(group).length,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || err.status || 500;
    return res.status(statusCode).json({
      success: false,
      code: err.code || undefined,
      error: err.message || "Failed to load group participants",
    });
  }
};

export const exportGroupParticipants = async (req, res) => {
  try {
    const { id, groupJid } = req.params;
    const format = String(req.query.format || "csv").toLowerCase();

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    }).select("-credentials");

    if (!session) {
      return res.status(404).json({
        success: false,
        code: "SESSION_NOT_FOUND",
        error: "Session not found",
      });
    }

    const group = await WhatsAppService.getGroupParticipants(id, groupJid);
    const phoneParticipants = getPhoneNumberParticipants(group);

    if (phoneParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        code: "NO_GROUP_PHONE_NUMBERS",
        error: "No phone numbers found in this group.",
      });
    }

    const exportGroup = { ...group, participants: phoneParticipants };
    const fileBase = sanitizeFileName(`${group.subject}_numbers`);

    if (format === "csv") {
      const csv = buildParticipantsCsv(exportGroup);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileBase}.csv"`,
      );
      return res.send(csv);
    }

    if (format === "doc") {
      const doc = buildParticipantsDoc(exportGroup);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileBase}.docx"`,
      );
      return res.send(doc);
    }

    if (format === "pdf") {
      const pdf = buildParticipantsPdf(exportGroup);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileBase}.pdf"`,
      );
      return res.send(pdf);
    }

    return res.status(400).json({
      success: false,
      code: "INVALID_EXPORT_FORMAT",
      error: "format must be csv, doc, or pdf",
    });
  } catch (err) {
    const statusCode = err.statusCode || err.status || 500;
    return res.status(statusCode).json({
      success: false,
      code: err.code || undefined,
      error: err.message || "Failed to export group participants",
    });
  }
};

export const importGroupParticipantsToNumberList = async (req, res) => {
  try {
    const { id, groupJid } = req.params;
    const { name = "" } = req.body || {};

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    }).select("-credentials");

    if (!session) {
      return res.status(404).json({
        success: false,
        code: "SESSION_NOT_FOUND",
        error: "Session not found",
      });
    }

    const group = await WhatsAppService.getGroupParticipants(id, groupJid);
    const phoneParticipants = getPhoneNumberParticipants(group);
    const numbers = phoneParticipants.map(
      (participant) => participant.phoneNumber,
    );

    if (numbers.length === 0) {
      return res.status(400).json({
        success: false,
        code: "NO_GROUP_PHONE_NUMBERS",
        error: "No phone numbers found in this group.",
      });
    }

    await SubscriptionService.assertResourceLimit(req.user, "numberLists", 1);

    const contactData = phoneParticipants.map((participant) => ({
      phone: participant.phoneNumber,
      name: participant.name,
      group: group.subject,
      role: participant.role,
    }));

    const list = await NumberList.create({
      userId: req.user._id,
      name: String(name || `${group.subject} numbers`).trim(),
      numbers,
      tags: ["group-import", group.subject],
      color: randomGroupListColor(),
      variables: ["phone", "name", "group", "role"],
      contactData,
    });

    return res.status(201).json({
      success: true,
      message: "Phone numbers imported to Number Lists",
      list: formatImportedList(list),
      skipped:
        group.unresolvedParticipantsCount ||
        Math.max((group.totalParticipants || 0) - numbers.length, 0),
    });
  } catch (err) {
    return sendSubscriptionError(
      res,
      err,
      "Failed to import group participants",
    );
  }
};

export const reconnectSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const result = await WhatsAppService.reconnectSession(id, { force: true });

    res.json({ success: true, status: result?.status || "connecting" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const logoutSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await WhatsAppSession.findOne({
      sessionId: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await WhatsAppService.logoutSession(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default {
  createSession,
  listSessions,
  getSession,
  getSessionQR,
  getSessionGroups,
  getGroupParticipants,
  exportGroupParticipants,
  importGroupParticipantsToNumberList,
  deleteSession,
  logoutSession,
  reconnectSession,
};
