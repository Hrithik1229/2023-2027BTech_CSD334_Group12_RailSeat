import { StationSearchInput } from "@/components/StationSearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/api";
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Plus,
    Repeat,
    Save,
    Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

interface Stop {
  station_id: number;
  station_name?: string;
  station_code?: string;
  arrival_time: string;
  departure_time: string;
  halt_duration: number;
  distance_from_source: number;
  _tempId?: string;
}

export default function AdminRouteBuilder() {
  const { id } = useParams(); // run_id
  const navigate = useNavigate();
  const [stops, setStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRun = async () => {
      try {
        const res = await fetch(`${API_BASE}/trains/runs/${id}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setRunDetails(data);

        if (data.stops) {
          const mappedStops = data.stops.map((s: any) => ({
            station_id: s.station_id,
            station_name: s.station.name,
            station_code: s.station.code,
            arrival_time: s.arrival_time,
            departure_time: s.departure_time,
            halt_duration: s.halt_duration,
            distance_from_source: s.distance_from_source,
            _tempId: Math.random().toString(36).substr(2, 9),
          }));
          setStops(mappedStops);
        }
      } catch (error) {
        toast.error("Failed to fetch run details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRun();
  }, [id]);

  const handleAddStop = (code: string) => {
    fetch(`${API_BASE}/trains/stations/search?q=${code}`)
      .then((res) => res.json())
      .then((data) => {
        const station = data.find((s: any) => s.code === code);
        if (station) {
          setStops((prev) => [
            ...prev,
            {
              station_id: station.id,
              station_name: station.name,
              station_code: station.code,
              arrival_time: "",
              departure_time: "",
              halt_duration: 0,
              distance_from_source: 0,
              _tempId: Math.random().toString(36).substr(2, 9),
            },
          ]);
        }
      });
  };

  const updateStop = (index: number, field: keyof Stop, value: any) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const moveStop = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stops.length - 1) return;
    const newStops = [...stops];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newStops[index], newStops[swapIndex]] = [
      newStops[swapIndex],
      newStops[index],
    ];
    setStops(newStops);
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log(stops);
    try {
      if (!stops || stops.length < 2) {
        toast.error("Add at least 2 stops before saving");
        return;
      }

      const payloadStops = stops.map((s) => ({
        station_id: s.station_id,
        arrival_time: s.arrival_time || null,
        departure_time: s.departure_time || null,
        halt_duration: Number(s.halt_duration) || 0,
        distance_from_source: Number(s.distance_from_source) || 0,
      }));

      const res = await fetch(`${API_BASE}/admin/runs/${id}/route`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stops: payloadStops }),
      });
      console.log('Save Route Response:', res.status, res.statusText);
      if (!res.ok) {
        const text = await res.text();
        console.error('Save Route Error Body:', text);
        try {
            const json = JSON.parse(text);
            throw new Error(json.error || "Failed to save");
        } catch (e) {
            throw new Error(`Failed to save: ${res.status} ${res.statusText}`);
        }
      }
      toast.success("Route saved successfully");
      navigate("/admin/runs");
    } catch (error: any) {
      console.error('Save Route Exception:', error);
      toast.error(error.message || "Failed to save route");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReverse = async () => {
    if (
      !confirm(
        "Create a reverse run automatically? This will clone this run and reverse direction.",
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_BASE}/admin/runs/${id}/reverse`,
        {
          method: "POST",
        },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Reverse run created!");
      navigate("/admin/runs");
    } catch (error) {
      toast.error("Failed to create reverse run");
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-slate-500">
        Loading route data...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/admin/runs")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReverse}>
            <Repeat className="w-4 h-4 mr-2" /> Auto Reverse
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> Save Route
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Route Builder</h2>
          <p className="text-slate-500">
            {runDetails?.train?.train_name} ({runDetails?.direction})
          </p>
        </div>

        <div className="space-y-3">
          {stops.map((stop, index) => (
            <div
              key={stop._tempId}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group"
            >
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-blue-600"
                  onClick={() => moveStop(index, "up")}
                  disabled={index === 0}
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <div className="text-center font-bold text-slate-400 text-sm bg-white rounded-md w-6 h-6 flex items-center justify-center border border-slate-200">
                  {index + 1}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-blue-600"
                  onClick={() => moveStop(index, "down")}
                  disabled={index === stops.length - 1}
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex-1 min-w-[150px]">
                <div className="font-bold text-slate-900">
                  {stop.station_name}
                </div>
                <div className="text-xs text-slate-500 font-mono bg-slate-200 px-1.5 py-0.5 rounded inline-block mt-1">
                  {stop.station_code}
                </div>
              </div>


              <div className="grid grid-cols-4 gap-3 w-[520px]">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                    Arrival
                  </label>
                  <Input
                    type="time"
                    className="h-9 text-sm bg-white"
                    value={stop.arrival_time || ""}
                    onChange={(e) =>
                      updateStop(index, "arrival_time", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                    Departure
                  </label>
                  <Input
                    type="time"
                    className="h-9 text-sm bg-white"
                    value={stop.departure_time || ""}
                    onChange={(e) =>
                      updateStop(index, "departure_time", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                    Halt (min)
                  </label>
                  <Input
                    type="number"
                    className="h-9 text-sm bg-white"
                    min="0"
                    value={
                      stop.halt_duration === null ||
                      stop.halt_duration === undefined ||
                      Number.isNaN(Number(stop.halt_duration))
                        ? ""
                        : String(stop.halt_duration)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        updateStop(index, "halt_duration", 0);
                        return;
                      }
                      const numeric = Number(raw);
                      updateStop(
                        index,
                        "halt_duration",
                        Number.isNaN(numeric) ? 0 : numeric,
                      );
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                    Dist (km)
                  </label>
                  <Input
                    type="number"
                    className="h-9 text-sm bg-white"
                    value={
                      stop.distance_from_source === null ||
                      stop.distance_from_source === undefined ||
                      Number.isNaN(Number(stop.distance_from_source))
                        ? ""
                        : String(stop.distance_from_source)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        // Show empty in UI, but keep 0 in state to avoid NaN
                        updateStop(index, "distance_from_source", 0);
                        return;
                      }
                      const numeric = Number(raw);
                      updateStop(
                        index,
                        "distance_from_source",
                        Number.isNaN(numeric) ? 0 : numeric,
                      );
                    }}
                  />
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={() => removeStop(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 border-t border-slate-100 bg-slate-50/50 rounded-xl">
          <label className="text-sm font-bold text-slate-500 mb-3 block flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Station to Route
          </label>
          <div className="max-w-md">
            <StationSearchInput
              placeholder="Type station code or name..."
              value=""
              onChange={handleAddStop}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
