"use client";
import { useState, useEffect, useRef } from "react";
import { BirthDataInput } from "@/lib/api";

interface Props {
  onSubmit: (data: BirthDataInput) => void;
  loading: boolean;
}

const AYANAMSHAS = [
  { id: "lahiri",       label: "Lahiri (Chitrapaksha)" },
  { id: "krishnamurti", label: "Krishnamurti (KP)" },
  { id: "raman",        label: "B.V. Raman" },
];

// Simple place autocomplete using OpenStreetMap Nominatim
async function searchPlaces(query: string): Promise<string[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: { display_name: string }) => item.display_name);
}

export function BirthForm({ onSubmit, loading }: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [ayanamsha, setAyanamsha] = useState<"lahiri" | "krishnamurti" | "raman">("lahiri");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(false); // true when user just picked a suggestion

  useEffect(() => {
    // Skip search if user just selected a suggestion
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(place);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [place]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !place) return;
    onSubmit({ name: name.trim() || undefined, date, time, place, ayanamsha });
    setShowSuggestions(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-semibold text-amber-400">Birth Details</h2>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Date of Birth</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Time */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Time of Birth</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            required
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Place with autocomplete */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Place of Birth</label>
        <input
          type="text"
          value={place}
          onChange={e => { setPlace(e.target.value); setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="e.g. Mumbai, India"
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onMouseDown={() => { selectedRef.current = true; setPlace(s); setShowSuggestions(false); setSuggestions([]); }}
                className="px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer truncate"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ayanamsha */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Ayanamsha</label>
        <select
          value={ayanamsha}
          onChange={e => setAyanamsha(e.target.value as typeof ayanamsha)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {AYANAMSHAS.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {loading ? "Calculating…" : "Calculate Chart"}
      </button>
    </form>
  );
}
