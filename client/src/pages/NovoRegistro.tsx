import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Redireciona diretamente para o formulário de lançamento único.
 * O card de "Escala em Lote" foi removido a pedido do usuário.
 */
export default function NovoRegistro() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/horas/novo", { replace: true });
  }, [navigate]);

  return null;
}
