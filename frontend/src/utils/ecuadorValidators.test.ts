import { describe, it, expect } from 'vitest';
import {
  validarCedulaEcuador,
  validarRucEcuador,
  validarPasaporte,
  validarDocumento,
} from './ecuadorValidators';

describe('Validador Oficial de Documentos de Ecuador (SRI)', () => {
  describe('validarCedulaEcuador', () => {
    it('debe validar cédulas ecuatorianas reales con algoritmo Módulo 10', () => {
      // 1710034065 es una cédula válida conocida de Pichincha
      expect(validarCedulaEcuador('1710034065')).toBe(true);
      // 0922841465 es una cédula válida de Guayas
      expect(validarCedulaEcuador('0922841465')).toBe(true);
    });

    it('debe rechazar cédulas con longitud distinta de 10', () => {
      expect(validarCedulaEcuador('171003406')).toBe(false);
      expect(validarCedulaEcuador('17100340650')).toBe(false);
    });

    it('debe rechazar códigos de provincia inválidos (> 24 o < 01)', () => {
      expect(validarCedulaEcuador('0010034065')).toBe(false);
      expect(validarCedulaEcuador('2510034065')).toBe(false);
    });

    it('debe rechazar tercer dígito inválido (>= 6 para personas naturales)', () => {
      expect(validarCedulaEcuador('1770034065')).toBe(false);
    });

    it('debe rechazar dígitos verificadores adulterados', () => {
      // 1710034065 con último dígito cambiado
      expect(validarCedulaEcuador('1710034064')).toBe(false);
      expect(validarCedulaEcuador('1710034066')).toBe(false);
    });
  });

  describe('validarRucEcuador', () => {
    it('debe aceptar RUC de persona natural terminado en 001 con cédula válida', () => {
      expect(validarRucEcuador('1710034065001')).toBe(true);
      expect(validarRucEcuador('0922841465001')).toBe(true);
    });

    it('debe rechazar RUC que no finalice en 001', () => {
      expect(validarRucEcuador('1710034065002')).toBe(false);
      expect(validarRucEcuador('1710034065000')).toBe(false);
    });

    it('debe aceptar RUC de sociedad privada con tercer dígito 9', () => {
      expect(validarRucEcuador('1792345678001')).toBe(true);
    });
  });

  describe('validarPasaporte', () => {
    it('debe aceptar pasaportes internacionales alfanuméricos válidos', () => {
      expect(validarPasaporte('A12345678')).toBe(true);
      expect(validarPasaporte('EC98765432')).toBe(true);
      expect(validarPasaporte('PA554433')).toBe(true);
    });

    it('debe rechazar cadenas sin letras o demasiado cortas', () => {
      expect(validarPasaporte('1234567')).toBe(false);
      expect(validarPasaporte('A12')).toBe(false);
    });
  });

  describe('validarDocumento', () => {
    it('debe devolver resultado estructurado con mensaje en caso de error', () => {
      const resInvalido = validarDocumento('CEDULA', '1111111111');
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.mensaje).toContain('Cédula');

      const resValido = validarDocumento('CEDULA', '1710034065');
      expect(resValido.valido).toBe(true);
      expect(resValido.mensaje).toBeUndefined();
    });

    it('debe aceptar consumidor final', () => {
      const resCF = validarDocumento('CONSUMIDOR_FINAL', '9999999999999');
      expect(resCF.valido).toBe(true);
    });
  });
});
