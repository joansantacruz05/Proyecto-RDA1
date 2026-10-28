import React, { useState } from 'react';
import { Star, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { RatingStars } from '../common/RatingStars';
import type { Reserva } from '../../types';
import { api } from '../../lib/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: Reserva | null;
  onReviewSubmitted: (reservaActualizada: Reserva) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  reserva,
  onReviewSubmitted,
}) => {
  const [calificacion, setCalificacion] = useState<number>(5);
  const [comentario, setComentario] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!reserva) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) {
      setErrorMsg('Por favor comparte tu opinión y experiencia.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const updated = await api.post<Reserva>(`/reservas/${reserva.id}/calificar`, {
        calificacion,
        comentario: comentario.trim(),
      });
      onReviewSubmitted(updated);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'No se pudo registrar tu calificación. Recuerda que solo se puede calificar una vez concluida la estancia (post check-out).'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Calificar Experiencia de Estancia" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-[#0B132B] p-3 rounded-xl border border-white/10 text-center">
          <div className="text-gray-400 mb-1">¿Cómo calificarías tu estadía en</div>
          <div className="text-base font-bold text-white mb-3">
            {reserva.alojamiento?.titulo || 'LuxeStays Alojamiento'}
          </div>

          <div className="flex justify-center mb-1">
            <RatingStars rating={calificacion} interactive onRatingChange={setCalificacion} size={28} />
          </div>
          <span className="text-[11px] text-[#D4AF37] font-semibold">
            {calificacion === 5
              ? 'Excelente · 5 Estrellas'
              : calificacion === 4
              ? 'Muy Bueno · 4 Estrellas'
              : calificacion === 3
              ? 'Aceptable · 3 Estrellas'
              : 'Regular · Requiere Mejoras'}
          </span>
        </div>

        <div>
          <label className="block text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
            <MessageSquare size={14} className="text-[#D4AF37]" />
            Comentarios y Reseña
          </label>
          <textarea
            rows={4}
            required
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Describe la limpieza, hospitalidad del anfitrión, ubicación y confort general..."
            className="w-full bg-[#0B132B] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#D4AF37] resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e0be4d] text-[#0B132B] font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20 disabled:opacity-50"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            <Star size={14} className="fill-[#0B132B]" />
            <span>{loading ? 'Publicando...' : 'Publicar Calificación'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReviewModal;
