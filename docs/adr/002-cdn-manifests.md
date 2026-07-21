# ADR-002 — Publicação por manifestos

Status: aceito. Playlist publicada gera JSON imutável; canal expõe ponteiro pequeno. Player faz bootstrap autenticado e depois consulta CDN com ETag. Resultado: zero query Neon por item ou repetição.
