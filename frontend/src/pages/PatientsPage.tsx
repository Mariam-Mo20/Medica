import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Patient } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Edit, Phone, User } from "lucide-react";

const GENDERS = ["male", "female"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(gender?: string) {
  if (gender === "female") return "bg-secondary-fixed text-secondary";
  return "bg-primary-fixed text-primary";
}

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      api.get<Patient[]>(`/patients/search?q=${encodeURIComponent(searchTerm)}`).then(setPatients);
    } else {
      api.get<Patient[]>("/patients/").then(setPatients).finally(() => setLoading(false));
    }
  }, [searchTerm]);

  useEffect(() => {
    api.get<Patient[]>("/patients/").then(setPatients).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-h1 text-h1 text-foreground">Patients</h1>
          <p className="text-body-lg text-outline mt-1">Manage patient records</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
        <Input
          placeholder="Search by name, MRN, or phone..."
          className="pl-10 h-11 bg-white border-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">MRN</th>
                <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-body-md text-outline animate-pulse">
                    Loading...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-body-md text-outline">
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${getAvatarColor(patient.gender)} flex items-center justify-center font-bold text-sm`}>
                          {getInitials(`${patient.first_name} ${patient.last_name}`)}
                        </div>
                        <div>
                          <Link to={`/patients/${patient.id}`} className="font-label-md text-primary hover:underline">
                            {patient.first_name} {patient.last_name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-body-md text-outline">{patient.medical_record_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize">{patient.gender || "—"}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-body-md text-outline">{patient.phone || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-colors"
                          title="View patient"
                        >
                          <User className="h-4 w-4" />
                        </Link>
                        {patient.phone && (
                          <a
                            href={`tel:${patient.phone}`}
                            className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-colors"
                            title={`Call ${patient.phone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && patients.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-body-sm text-outline">Showing {patients.length} patient{patients.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
