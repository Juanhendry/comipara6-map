"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/imageUtils";

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ role }) {
  const map = {
    user:        "bg-blue-50 text-blue-700 border-blue-200",
    admin:       "bg-violet-50 text-violet-700 border-violet-200",
    super_admin: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[role]||""}`}>
      {role==="super_admin"?"Super Admin":role==="admin"?"Admin":"User"}
    </span>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if(!msg) return null;
  const colors = type==="error"
    ? "bg-rose-50 border-rose-300 text-rose-700"
    : "bg-emerald-50 border-emerald-300 text-emerald-700";
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl border shadow-lg text-xs font-semibold whitespace-nowrap ${colors}`}>
      {msg}
    </div>
  );
}

// ─── FANDOM PICKER (dengan search) ───────────────────────────────────────────
function FandomPicker({ fandoms, selected, onChange }) {
  const [search, setSearch] = useState("");

  const filtered = fandoms.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  function toggleFandom(f) {
    onChange(selected.includes(f) ? selected.filter(x => x !== f) : [...selected, f]);
  }

  function clearAll() { onChange([]); }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 text-xs">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari fandom..."
          className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 bg-gray-50"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
        )}
      </div>

      {/* Selected count & clear */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-violet-600 font-semibold">{selected.length} fandom dipilih</span>
          <button onClick={clearAll} className="text-[10px] text-rose-400 hover:text-rose-600">Hapus semua</button>
        </div>
      )}

      {/* Checklist grid */}
      <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-1">
        {filtered.map(f => {
          const checked = selected.includes(f);
          return (
            <button
              key={f}
              type="button"
              onClick={() => toggleFandom(f)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border text-left transition-all ${
                checked
                  ? "bg-violet-50 border-violet-300 text-violet-700"
                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border text-[9px] ${
                checked ? "bg-violet-500 border-violet-500 text-white" : "border-gray-300"
              }`}>
                {checked ? "✓" : ""}
              </span>
              <span className="truncate">{f}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-2 text-xs text-gray-300 py-4 text-center">
            {search ? `Tidak ada fandom "${search}"` : "Belum ada fandom tersedia"}
          </p>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
          {selected.map(f => (
            <span key={f} className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px]">
              {f}
              <button onClick={() => toggleFandom(f)} className="text-violet-400 hover:text-violet-700 leading-none">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [me, setMe]               = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [users, setUsers]         = useState([]);
  const [fandoms, setFandoms]     = useState([]);
  const [modal, setModal]         = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [catalog, setCatalog]     = useState([]);
  const [prices, setPrices]       = useState([]);
  const [newPrice, setNewPrice]   = useState({ item:"", price:"" });
  const [toast, setToast]         = useState({msg:"",type:"success"});
  const [uploading, setUploading] = useState(false);
  const fileRef  = useRef();
  const excelRef = useRef();

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast({msg:"",type:"success"}), 3000);
  }

  useEffect(()=>{
    const stored = localStorage.getItem("cp6_user");
    if(!stored){ router.push("/cp6-staff"); return; }
    const user = JSON.parse(stored);
    setMe(user);

    // Load data from API
    async function loadData(){
      try{
        const [usersRes, fandomsRes] = await Promise.all([
          fetch("/api/users?auth=1"),
          fetch("/api/fandoms"),
        ]);
        const allUsers = await usersRes.json();
        const allFandoms = await fandomsRes.json();
        setUsers(allUsers);
        setFandoms(allFandoms);

        const found = allUsers.find(u=>u.email===user.email);
        if(found){
          const [catRes, priceRes] = await Promise.all([
            fetch(`/api/catalog?userId=${found.id}`),
            fetch(`/api/prices?userId=${found.id}`),
          ]);
          setCatalog(await catRes.json());
          setPrices(await priceRes.json());
        }
      }catch(err){
        console.error("Failed to load dashboard data:", err);
      }
    }
    loadData();
  },[]);

  function logout() {
    localStorage.removeItem("cp6_role");
    localStorage.removeItem("cp6_user");
    router.push("/cp6-staff");
  }

  async function persistUsers(updated) {
    setUsers(updated);
    // Sync to server
    try{
      // We do a full replace via PUT for simplicity
      for(const u of updated){
        await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u),
        });
      }
    }catch(err){ console.error("Failed to sync users:", err); }
  }

  if(!me) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading...</div>
    </div>
  );

  const isAdmin      = me.role==="admin" || me.role==="super_admin";
  const isSuperAdmin = me.role==="super_admin";
  const myData       = users.find(u=>u.email===me.email);

  // ── Catalog (with image compression) ──────────────────────────────────────
  async function handleCatalogUpload(e) {
    const files = Array.from(e.target.files);
    if(!files.length || !myData) return;
    setUploading(true);

    try{
      const formData = new FormData();
      formData.append("userId", String(myData.id));

      // Compress each image client-side before upload
      for(const file of files){
        const compressed = await compressImageFile(file);
        formData.append("files", compressed);
      }

      const res = await fetch("/api/catalog", { method: "POST", body: formData });
      const updated = await res.json();
      setCatalog(updated);
      showToast(`${files.length} gambar berhasil diupload`);
    }catch(err){
      console.error("Upload failed:", err);
      showToast("Upload gagal", "error");
    }
    setUploading(false);
    e.target.value="";
  }

  async function deleteCatalog(item) {
    if(!myData) return;
    try{
      const res = await fetch("/api/catalog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myData.id, catalogId: item.id, url: item.url }),
      });
      const updated = await res.json();
      setCatalog(updated);
      showToast("Gambar dihapus");
    }catch(err){
      showToast("Gagal menghapus", "error");
    }
  }

  // ── Pricelist ─────────────────────────────────────────────────────────────
  async function addPrice() {
    if(!newPrice.item||!newPrice.price||!myData) return;
    try{
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myData.id, ...newPrice }),
      });
      const updated = await res.json();
      setPrices(updated);
      setNewPrice({item:"",price:""});
    }catch(err){ showToast("Gagal menambah harga", "error"); }
  }

  async function deletePrice(priceId) {
    if(!myData) return;
    try{
      const res = await fetch("/api/prices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myData.id, priceId }),
      });
      const updated = await res.json();
      setPrices(updated);
      showToast("Harga dihapus");
    }catch(err){ showToast("Gagal menghapus", "error"); }
  }

  // ── User self-select fandom ───────────────────────────────────────────────
  async function saveMyFandoms(newFandoms) {
    if(!myData) return;
    const updated = users.map(u=>u.id===myData.id ? {...u, fandoms:newFandoms} : u);
    await persistUsers(updated);
    showToast("Fandom berhasil disimpan");
  }

  // ── Admin: user management ────────────────────────────────────────────────
  async function saveUser(updatedUser) {
    const newUsers = users.map(u=>u.id===updatedUser.id?updatedUser:u);
    await persistUsers(newUsers);
    setModal(null);
    showToast("User berhasil diperbarui");
  }

  async function deleteUser(id) {
    if(!isSuperAdmin) return;
    try{
      await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u=>u.id!==id));
      showToast("User dihapus");
    }catch(err){ showToast("Gagal menghapus user", "error"); }
  }

  async function addUser(data) {
    try{
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const newUser = await res.json();
      setUsers(prev => [...prev, newUser]);
      setModal(null);
      showToast("User berhasil ditambahkan");
    }catch(err){ showToast("Gagal menambah user", "error"); }
  }

  // ── Admin: assign booth ───────────────────────────────────────────────────
  function assignBooth(userId, boothId) {
    const booth = boothId.trim().toUpperCase();
    if(!booth) return { ok:false, msg:"ID Booth tidak boleh kosong" };
    const allAssigned = users.flatMap(u => u.booths || []);
    const targetUser  = users.find(u=>u.id===userId);
    if(allAssigned.includes(booth) && !targetUser?.booths.includes(booth)) {
      return { ok:false, msg:`Booth ${booth} sudah di-assign ke user lain` };
    }
    const newUsers = users.map(u=>{
      if(u.id!==userId) return u;
      return { ...u, booths:[...new Set([...u.booths,booth])] };
    });
    persistUsers(newUsers);
    return { ok:true };
  }

  function unassignBooth(userId, booth) {
    const newUsers = users.map(u=>{
      if(u.id!==userId) return u;
      return { ...u, booths:u.booths.filter(b=>b!==booth) };
    });
    persistUsers(newUsers);
    showToast(`Booth ${booth} berhasil dihapus`);
  }

  // ── Admin: fandom management ──────────────────────────────────────────────
  async function addFandoms(input) {
    const newFandoms = input.split(",").map(f=>f.trim()).filter(f=>f.length>0);
    try{
      const res = await fetch("/api/fandoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fandoms: newFandoms }),
      });
      const merged = await res.json();
      setFandoms(merged);
      showToast(`${newFandoms.length} fandom ditambahkan`);
    }catch(err){ showToast("Gagal menambah fandom", "error"); }
  }

  async function deleteFandom(f) {
    try{
      const res = await fetch("/api/fandoms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fandom: f }),
      });
      const updated = await res.json();
      setFandoms(updated);
      showToast(`Fandom "${f}" dihapus`);
    }catch(err){ showToast("Gagal menghapus fandom", "error"); }
  }

  // ── Excel / CSV upload ────────────────────────────────────────────────────
  async function handleExcelUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async ev=>{
      try {
        const text = ev.target.result;
        const lines = text.split("\n").filter(l=>l.trim());
        const isHeader = lines[0].toLowerCase().includes("email");
        const dataLines = isHeader ? lines.slice(1) : lines;
        let added=0, skipped=0, errors=[];
        const allEmails = users.map(u=>u.email.toLowerCase());

        for(const [idx, line] of dataLines.entries()){
          const cols = line.split(",").map(c=>c.trim().replace(/^"|"$/g,""));
          if(cols.length<2){ errors.push(`Baris ${idx+2}: format salah`); continue; }
          const [email,name,boothRaw,password] = cols;
          if(!email||!name){ errors.push(`Baris ${idx+2}: email/nama kosong`); continue; }
          if(allEmails.includes(email.toLowerCase())){ skipped++; continue; }
          const boothList = boothRaw ? boothRaw.split(";").map(b=>b.trim().toUpperCase()).filter(Boolean) : [];
          const allAssigned = users.flatMap(u => u.booths || []);
          const validBooths = boothList.filter(b=>!allAssigned.includes(b));
          const conflicted  = boothList.filter(b=>allAssigned.includes(b));
          if(conflicted.length>0) errors.push(`Baris ${idx+2}: booth ${conflicted.join(",")} sudah digunakan`);

          try{
            const res = await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email:email.toLowerCase(), password:password||"user123", role:"user", booths:validBooths, fandoms:[] }),
            });
            const newUser = await res.json();
            setUsers(prev => [...prev, newUser]);
            allEmails.push(email.toLowerCase());
            added++;
          }catch{ errors.push(`Baris ${idx+2}: gagal menambah`); }
        }

        showToast(
          `${added} user ditambahkan${skipped>0?`, ${skipped} sudah ada`:""}${errors.length>0?`. ${errors.length} error`:""}`,
          errors.length>0?"error":"success"
        );
      } catch {
        showToast("Gagal parse file. Pastikan format CSV yang benar.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value="";
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id:"profile", label:"Profil & Booth" },
    { id:"fandom",  label:"Fandom Saya" },
    { id:"catalog", label:"Katalog" },
    { id:"prices",  label:"Harga" },
    ...(isAdmin ? [{ id:"users",   label:"Kelola User" }] : []),
    ...(isAdmin ? [{ id:"booths",  label:"Assign Booth" }] : []),
    ...(isAdmin ? [{ id:"fandoms", label:"Master Fandom" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast msg={toast.msg} type={toast.type}/>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={()=>router.push("/")} className="text-[11px] text-gray-400 hover:text-gray-600">← Peta</button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{me.name || me.email}</span>
              <Badge role={me.role}/>
            </div>
          </div>
        </div>
        <button onClick={logout} className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Keluar</button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 overflow-x-auto">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab===t.id?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: PROFILE ── */}
        {activeTab==="profile"&&(
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Informasi Akun</h2>
              <div className="space-y-2">
                {[["Nama",me.name||"-"],["Email",me.email],["Role",<Badge role={me.role}/>]].map(([label,val])=>(
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-xs font-medium text-gray-700">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            {myData?.booths?.length>0&&(
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Booth Kamu</h2>
                <div className="flex flex-wrap gap-2">
                  {myData.booths.map(b=>(
                    <span key={b} className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-semibold">{b}</span>
                  ))}
                </div>
                {myData?.fandoms?.length>0&&(
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {myData.fandoms.map(f=>(
                      <span key={f} className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-[10px]">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: FANDOM SAYA ── */}
        {activeTab==="fandom"&&(
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-gray-900">Fandom Saya</h2>
              <span className="text-[10px] text-gray-400">Pilih fandom yang kamu wakili di booth</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">Gunakan kolom pencarian untuk menemukan fandom dengan cepat.</p>
            <FandomPicker
              fandoms={fandoms}
              selected={myData?.fandoms||[]}
              onChange={(newSel)=>{
                const updated = users.map(u=>u.id===myData?.id?{...u,fandoms:newSel}:u);
                setUsers(updated);
              }}
            />
            <button
              onClick={()=>saveMyFandoms(myData?.fandoms||[])}
              className="mt-4 w-full py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition-colors"
            >
              Simpan Fandom
            </button>
          </div>
        )}

        {/* ── TAB: KATALOG ── */}
        {activeTab==="catalog"&&(
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Katalog Gambar</h2>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 disabled:opacity-50">
                {uploading ? "Mengupload..." : "+ Upload"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleCatalogUpload}/>
            </div>
            {catalog.length===0
              ? <div className="text-center py-12 text-gray-300"><div className="text-4xl mb-2">🖼️</div><p className="text-xs">Belum ada gambar.</p></div>
              : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {catalog.map(img=>(
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-square">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy"/>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={()=>deleteCatalog(img)}
                          className="px-2.5 py-1 bg-rose-500 text-white text-xs rounded-lg">Hapus</button>
                      </div>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-2 py-1 truncate">{img.name}</p>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── TAB: HARGA ── */}
        {activeTab==="prices"&&(
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Tabel Harga</h2>
            <div className="flex gap-2 mb-4">
              <input value={newPrice.item} onChange={e=>setNewPrice(p=>({...p,item:e.target.value}))}
                placeholder="Nama item" className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"/>
              <input value={newPrice.price} onChange={e=>setNewPrice(p=>({...p,price:e.target.value}))}
                placeholder="Harga (e.g. 50000)" className="w-36 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"/>
              <button onClick={addPrice} className="px-3 py-2 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600">Tambah</button>
            </div>
            {prices.length===0
              ? <div className="text-center py-10 text-gray-300"><div className="text-3xl mb-2">📋</div><p className="text-xs">Belum ada data harga.</p></div>
              : <table className="w-full text-xs"><thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-400 font-medium">Item</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Harga</th>
                    <th className="w-8"></th>
                  </tr></thead>
                  <tbody>
                    {prices.map(p=>(
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2.5 text-gray-700 font-medium">{p.item}</td>
                        <td className="py-2.5 text-right text-gray-600">Rp {parseInt(p.price).toLocaleString("id-ID")}</td>
                        <td className="py-2.5 text-right">
                          <button onClick={()=>deletePrice(p.id)} className="text-rose-400 hover:text-rose-600 text-[10px]">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── TAB: KELOLA USER ── */}
        {activeTab==="users"&&isAdmin&&(
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-gray-900">Daftar User</h2>
                <div className="flex gap-2">
                  <button onClick={()=>excelRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 flex items-center gap-1">
                    📊 Upload CSV
                  </button>
                  <input ref={excelRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleExcelUpload}/>
                  <button onClick={()=>setModal("addUser")}
                    className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600">
                    + Tambah User
                  </button>
                </div>
              </div>
              <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400">
                Format CSV: <code className="bg-gray-100 px-1 rounded">email,nama,booth(pisah &quot;;&quot;),password</code> — contoh: <code className="bg-gray-100 px-1 rounded">budi@mail.com,Budi,A01;A02,pass123</code>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map(u=>(
                  <div key={u.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{u.name}</span>
                        <Badge role={u.role}/>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{u.email}</p>
                      {u.booths.length>0&&(
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {u.booths.map(b=><span key={b} className="text-[9px] px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded">{b}</span>)}
                        </div>
                      )}
                      {u.fandoms?.length>0&&(
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {u.fandoms.slice(0,3).map(f=><span key={f} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">{f}</span>)}
                          {u.fandoms.length>3&&<span className="text-[9px] text-gray-400">+{u.fandoms.length-3} lainnya</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{setEditTarget(u);setModal("editUser");}}
                        className="text-[10px] px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Edit</button>
                      {isSuperAdmin&&u.role!=="super_admin"&&(
                        <button onClick={()=>deleteUser(u.id)}
                          className="text-[10px] px-2.5 py-1 border border-rose-200 rounded-lg text-rose-500 hover:bg-rose-50">Hapus</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: ASSIGN BOOTH ── */}
        {activeTab==="booths"&&isAdmin&&(
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Assign Booth ke User</h2>
              <div className="space-y-3">
                {users.filter(u=>u.role==="user").map(u=>(
                  <BoothAssignRow
                    key={u.id} user={u}
                    onAssign={(booth)=>{
                      const result = assignBooth(u.id, booth);
                      if(result.ok) showToast(`Booth ${booth.toUpperCase()} berhasil di-assign ke ${u.name}`);
                      else showToast(result.msg,"error");
                      return result;
                    }}
                    onUnassign={(booth)=>unassignBooth(u.id,booth)}
                    allUsers={users}
                  />
                ))}
                {users.filter(u=>u.role==="user").length===0&&(
                  <p className="text-xs text-gray-400 text-center py-8">Belum ada user biasa</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: MASTER FANDOM (admin) ── */}
        {activeTab==="fandoms"&&isAdmin&&(
          <FandomManager fandoms={fandoms} onAdd={addFandoms} onDelete={deleteFandom}/>
        )}
      </div>

      {/* ── MODAL: Edit User ── */}
      {modal==="editUser"&&editTarget&&(
        <Modal title={`Edit User — ${editTarget.name}`} onClose={()=>setModal(null)}>
          <EditUserForm user={editTarget} onSave={saveUser} isSuperAdmin={isSuperAdmin} fandoms={fandoms}/>
        </Modal>
      )}
      {/* ── MODAL: Add User ── */}
      {modal==="addUser"&&(
        <Modal title="Tambah User Baru" onClose={()=>setModal(null)}>
          <AddUserForm onAdd={addUser} isSuperAdmin={isSuperAdmin}/>
        </Modal>
      )}
    </div>
  );
}

// ─── BOOTH ASSIGN ROW ─────────────────────────────────────────────────────────
function BoothAssignRow({ user, onAssign, onUnassign, allUsers }) {
  const [input,   setInput]   = useState("");
  const [errMsg,  setErrMsg]  = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");

  function handleAssign() {
    if(!input.trim()){ setErrMsg("Masukkan ID booth"); return; }
    const result = onAssign(input.trim());
    if(result.ok){ setInput(""); setErrMsg(""); }
    else setErrMsg(result.msg);
  }

  function handleEditSave(oldBooth) {
    const newBooth = editVal.trim().toUpperCase();
    if(!newBooth){ setErrMsg("ID booth tidak boleh kosong"); return; }
    const allAssigned = allUsers.flatMap(u=> u.id===user.id ? [] : u.booths);
    if(allAssigned.includes(newBooth)){ setErrMsg(`Booth ${newBooth} sudah di-assign ke user lain`); return; }
    onUnassign(oldBooth);
    setTimeout(()=>{ onAssign(newBooth); },50);
    setEditIdx(null); setEditVal(""); setErrMsg("");
  }

  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-gray-800">{user.name}</span>
          <p className="text-[10px] text-gray-400">{user.email}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {user.booths.length===0&&<span className="text-[9px] text-gray-300">Belum ada booth</span>}
        {user.booths.map((b,i)=>(
          editIdx===i
            ? <div key={b} className="flex items-center gap-1">
                <input value={editVal} onChange={e=>setEditVal(e.target.value.toUpperCase())}
                  className="w-16 px-1.5 py-0.5 text-[10px] border border-violet-400 rounded"
                  onKeyDown={e=>{ if(e.key==="Enter") handleEditSave(b); if(e.key==="Escape"){setEditIdx(null);setErrMsg("");} }}
                  autoFocus/>
                <button onClick={()=>handleEditSave(b)} className="text-[9px] px-1.5 py-0.5 bg-violet-500 text-white rounded">✓</button>
                <button onClick={()=>{setEditIdx(null);setErrMsg("");}} className="text-[9px] px-1 text-gray-400">✕</button>
              </div>
            : <div key={b} className="flex items-center gap-0.5 bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                <span className="text-[9px] font-semibold">{b}</span>
                <button onClick={()=>{setEditIdx(i);setEditVal(b);}} className="text-violet-400 hover:text-violet-700 text-[8px] ml-0.5 leading-none" title="Edit">✎</button>
                <button onClick={()=>onUnassign(b)} className="text-rose-400 hover:text-rose-600 text-[8px] ml-0.5 leading-none" title="Hapus">✕</button>
              </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e=>{setInput(e.target.value);setErrMsg("");}}
          placeholder="ID Booth (e.g. A01)"
          onKeyDown={e=>{ if(e.key==="Enter") handleAssign(); }}
          className={`flex-1 px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:border-violet-400 ${errMsg?"border-rose-300 bg-rose-50":"border-gray-200"}`}/>
        <button onClick={handleAssign}
          className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600">
          Assign
        </button>
      </div>
      {errMsg&&<p className="text-[10px] text-rose-500 mt-1">⚠ {errMsg}</p>}
    </div>
  );
}

// ─── FANDOM MANAGER (admin: master list) ──────────────────────────────────────
function FandomManager({ fandoms, onAdd, onDelete }) {
  const [input,  setInput]  = useState("");
  const [filter, setFilter] = useState("");

  const filtered = fandoms.filter(f=>f.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Tambah Fandom</h2>
        <p className="text-[10px] text-gray-400 mb-3">Pisahkan dengan koma. Contoh: <code className="bg-gray-100 px-1 rounded">frieren, gachiakuta, arknights</code></p>
        <div className="flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)}
            placeholder="Frieren, Gachiakuta, Arknights..."
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
          <button onClick={()=>{ if(input.trim()){ onAdd(input); setInput(""); } }}
            className="px-4 py-2 bg-violet-500 text-white text-xs font-semibold rounded-xl hover:bg-violet-600">
            Tambah
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Daftar Fandom ({fandoms.length})</h2>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-xs">🔍</span>
            <input value={filter} onChange={e=>setFilter(e.target.value)}
              placeholder="Cari..." className="w-32 pl-6 pr-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"/>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
          {filtered.map(f=>(
            <div key={f} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
              <span className="text-xs text-gray-700">{f}</span>
              <button onClick={()=>onDelete(f)} className="text-rose-400 hover:text-rose-600 text-[10px] ml-0.5 leading-none">✕</button>
            </div>
          ))}
          {filtered.length===0&&<p className="text-xs text-gray-300 py-4 w-full text-center">Tidak ada fandom ditemukan</p>}
        </div>
      </div>
    </div>
  );
}

// ─── EDIT USER FORM ────────────────────────────────────────────────────────
function EditUserForm({ user, onSave, isSuperAdmin, fandoms }) {
  const [form,       setForm]       = useState({ ...user });
  const [selFandoms, setSelFandoms] = useState(user.fandoms||[]);
  const [showPass,   setShowPass]   = useState(false);

  return (
    <div className="space-y-4">
      {[["Nama","name","text"],["Email","email","email"]].map(([label,key,type])=>(
        <div key={key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
          <input type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
        </div>
      ))}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password <span className="text-gray-400 font-normal">(kosongkan jika tidak diubah)</span></label>
        <div className="relative">
          <input type={showPass?"text":"password"} value={form.password||""} onChange={e=>setForm(p=>({...p,password:e.target.value}))}
            placeholder="Password baru..."
            className="w-full px-3 py-2 pr-24 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
          <button type="button" onClick={()=>setShowPass(p=>!p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]">
            {showPass?"Sembunyikan":"Tampilkan"}
          </button>
        </div>
      </div>
      {isSuperAdmin&&(
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      )}
      {/* Fandom dengan search */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Fandom</label>
        <FandomPicker fandoms={fandoms} selected={selFandoms} onChange={setSelFandoms}/>
      </div>
      <button onClick={()=>onSave({...form,fandoms:selFandoms})}
        className="w-full py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition-colors">
        Simpan
      </button>
    </div>
  );
}

// ─── ADD USER FORM ────────────────────────────────────────────────────────────
function AddUserForm({ onAdd, isSuperAdmin }) {
  const [form,     setForm]     = useState({ name:"", email:"", password:"user123", role:"user" });
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="space-y-4">
      {[["Nama","name","text"],["Email","email","email"]].map(([label,key,type])=>(
        <div key={key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
          <input type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
        </div>
      ))}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <div className="relative">
          <input type={showPass?"text":"password"} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}
            className="w-full px-3 py-2 pr-24 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400"/>
          <button type="button" onClick={()=>setShowPass(p=>!p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]">
            {showPass?"Sembunyikan":"Tampilkan"}
          </button>
        </div>
      </div>
      {isSuperAdmin&&(
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      )}
      <button onClick={()=>{if(form.name&&form.email&&form.password)onAdd(form);}}
        className="w-full py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600">
        Tambah User
      </button>
    </div>
  );
}