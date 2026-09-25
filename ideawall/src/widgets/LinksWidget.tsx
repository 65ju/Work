import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Plus, X } from "lucide-react";
import { usePersistent } from "../lib/usePersistent";
import { uid } from "../lib/storage";

interface LinkItem {
  id: string;
  label: string;
  url: string;
}

function hue(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export const LinksWidget = memo(function LinksWidget() {
  const [links, setLinks] = usePersistent<LinkItem[]>("links-v3", []);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const add = () => {
    const raw = url.trim();
    if (!raw) return;
    const full = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    let name = label.trim();
    if (!name) {
      try {
        name = new URL(full).hostname.replace(/^www\./, "");
      } catch {
        name = raw;
      }
    }
    setLinks((l) => [...l, { id: uid(), label: name, url: full }]);
    setUrl("");
    setLabel("");
    setAdding(false);
  };

  return (
    <div>
      <div className="links">
        <AnimatePresence initial={false}>
          {links.map((l) => {
            const h = hue(l.label);
            return (
              <motion.div key={l.id} layout className="link" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  <span className="link-badge" style={{ background: `hsl(${h} 70% 55% / 0.18)`, color: `hsl(${h} 75% 62%)` }}>
                    {l.label.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="link-label">{l.label}</span>
                  <ExternalLink size={13} className="link-ext" />
                </a>
                <button type="button" className="link-del" aria-label={`${l.label} entfernen`} onClick={() => setLinks((a) => a.filter((x) => x.id !== l.id))}>
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!adding && (
          <button type="button" className="link link-add" onClick={() => setAdding(true)}>
            <Plus size={15} /> Link hinzufügen
          </button>
        )}
      </div>
      <AnimatePresence>
        {adding && (
          <motion.form
            className="link-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Adresse, z. B. github.com" aria-label="Adresse" />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name (optional)" aria-label="Name" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!url.trim()}>
              Speichern
            </button>
            <button type="button" className="icon-btn" aria-label="Abbrechen" onClick={() => setAdding(false)}>
              <X size={16} />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
});
