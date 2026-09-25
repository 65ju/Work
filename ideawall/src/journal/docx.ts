import { strToU8, zipSync } from "fflate";
import type { ReportDay } from "./data";
import { hoursLabel, longDate, parseWeekKey, WEEKDAY_LONG, weekday, weekDates } from "./dates";
import { KIND_META } from "./schedule";

/*
 * Erzeugt eine .docx im Stil des IHK-Ausbildungsnachweises (wöchentlich).
 * Sobald die Firmenvorlage da ist, wird stattdessen sie befüllt – Aufbau und Daten bleiben gleich.
 */

export interface DocxInfo {
  name: string;
  job: string;
  trainingYear: string;
}

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function run(text: string, o: { b?: boolean; size?: number; color?: string } = {}) {
  const pr = [o.b ? "<w:b/>" : "", o.color ? `<w:color w:val="${o.color}"/>` : "", o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : ""].join("");
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}

function para(runs: string, o: { after?: number; align?: "center" | "right"; keep?: boolean } = {}) {
  // Reihenfolge laut OOXML-Schema: keepNext → spacing → jc
  const ppr = [o.keep ? "<w:keepNext/>" : "", `<w:spacing w:before="0" w:after="${o.after ?? 40}"/>`, o.align ? `<w:jc w:val="${o.align}"/>` : ""].join("");
  return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
}

function cell(content: string, width: number, o: { shade?: string; vAlign?: "center" | "top" | "bottom"; span?: number; line?: boolean } = {}) {
  const pr = [
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    o.span ? `<w:gridSpan w:val="${o.span}"/>` : "",
    o.line ? '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:space="0" w:color="7F7F7F"/></w:tcBorders>' : "",
    o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : "",
    o.vAlign ? `<w:vAlign w:val="${o.vAlign}"/>` : "",
  ].join("");
  return `<w:tc><w:tcPr>${pr}</w:tcPr>${content || para("")}</w:tc>`;
}

function table(widths: number[], rows: string[], borders = true) {
  const b = borders
    ? `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="7F7F7F"/>`).join("")}</w:tblBorders>`
    : "";
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, c) => a + c, 0)}" w:type="dxa"/>${b}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths
    .map((w) => `<w:gridCol w:w="${w}"/>`)
    .join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}

const row = (cells: string, header = false) => `<w:tr>${header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells}</w:tr>`;

const hours = (min: number) => (Math.round((min / 60) * 100) / 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function buildDocx(week: string, days: ReportDay[], info: DocxInfo): Blob {
  const { week: kw } = parseWeekKey(week);
  const dates = weekDates(week);
  const W = [1700, 6738, 1200];
  const total = days.reduce((m, d) => m + d.minutes, 0);

  const head = table(
    [2400, 7238],
    [
      ["Name", info.name],
      ["Ausbildungsberuf", info.job],
      ...(info.trainingYear ? [["Ausbildungsjahr", `${info.trainingYear}. Ausbildungsjahr`]] : []),
      ["Ausbildungswoche", `KW ${kw} · ${longDate(dates[0])} – ${longDate(dates[4])}`],
    ].map(([k, v]) => row(cell(para(run(k, { b: true, size: 18, color: "404040" })), 2400, { shade: "F2F2F2" }) + cell(para(run(v, { size: 20 })), 7238))),
  );

  const body = days.map((d) => {
    const lines: string[] = [];
    const free = d.kind === "vacation" || d.kind === "sick" || d.kind === "off";
    if (free) lines.push(para(run(KIND_META[d.kind].label, { b: true, size: 20 })));
    const betrieb = d.betrieb.split("\n").map((l) => l.trim()).filter(Boolean);
    const schule = d.schule.split("\n").map((l) => l.trim()).filter(Boolean);
    if (betrieb.length) {
      if (schule.length) lines.push(para(run("Betriebliche Tätigkeiten", { b: true, size: 18, color: "404040" })));
      lines.push(...betrieb.map((l) => para(run(`– ${l}`, { size: 20 }))));
    }
    if (schule.length) {
      lines.push(para(run("Themen des Berufsschulunterrichts", { b: true, size: 18, color: "404040" })));
      lines.push(...schule.map((l) => para(run(`– ${l}`, { size: 20 }))));
    }
    return row(
      cell(para(run(WEEKDAY_LONG[weekday(d.date)], { b: true, size: 20 })) + para(run(longDate(d.date), { size: 18, color: "595959" })), W[0]) +
        cell(lines.join(""), W[1]) +
        cell(para(run(hours(d.minutes), { size: 20 }), { align: "center" }), W[2], { vAlign: "center" }),
    );
  });

  const main = table(W, [
    row(
      cell(para(run("Tag", { b: true, size: 18 })), W[0], { shade: "E7E6E6" }) +
        cell(para(run("Betriebliche Tätigkeiten, Unterweisungen, Themen des Berufsschulunterrichts", { b: true, size: 18 })), W[1], { shade: "E7E6E6" }) +
        cell(para(run("Stunden", { b: true, size: 18 }), { align: "center" }), W[2], { shade: "E7E6E6" }),
      true,
    ),
    ...body,
    row(cell(para(run("Gesamtstunden", { b: true, size: 20 })), W[0] + W[1], { span: 2, shade: "F2F2F2" }) + cell(para(run(hours(total), { b: true, size: 20 }), { align: "center" }), W[2], { shade: "F2F2F2" })),
  ]);

  const sign = table(
    [4719, 200, 4719],
    [
      row(cell(para("", { after: 600 }), 4719, { line: true }) + cell("", 200) + cell(para("", { after: 600 }), 4719, { line: true })),
      row(
        cell(para(run("Datum, Unterschrift Auszubildende/r", { size: 16, color: "595959" })), 4719) +
          cell("", 200) +
          cell(para(run("Datum, Unterschrift Ausbilder/in", { size: 16, color: "595959" })), 4719),
      ),
    ],
    false,
  );

  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${para(run("Ausbildungsnachweis", { b: true, size: 32 }), { after: 0 })}${para(
    run("wöchentlich · " + hoursLabel(total).replace(" h", " Stunden"), { size: 18, color: "595959" }),
    { after: 200 },
  )}${head}${para("", { after: 160 })}${main}${para("", { after: 360 })}${sign}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="de-DE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

  const files = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ),
    "word/_rels/document.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "word/document.xml": strToU8(doc),
    "word/styles.xml": strToU8(styles),
  };
  const zip = zipSync(files, { level: 6 });
  return new Blob([zip as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
