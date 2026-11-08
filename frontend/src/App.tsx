import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { PeriodoProvider } from "@/lib/periodo";
import Painel from "@/pages/Painel";
import Relatorio from "@/pages/Relatorio";
import Categorias from "@/pages/Categorias";
import Analise from "@/pages/Analise";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <PeriodoProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Painel />} />
          <Route path="/relatorio" element={<Relatorio />} />
          <Route path="/analise" element={<Analise />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PeriodoProvider>
  );
}
