# Segurança

- Better Auth com senha mínima de 12 caracteres e hashing seguro nativo.
- Autorização revalidada em cada Route Handler/Server Component; navegação não é controle de acesso.
- RBAC: admin, editor, operador e visualizador. Negação por padrão.
- Escopo tenant derivado da sessão. IDs de outro tenant retornam ausência/negação.
- Tokens de dispositivo: 256 bits, somente SHA-256 persistido, bearer header, revogação individual.
- Pareamento: seis dígitos, 10 minutos, uso único, máximo cinco tentativas.
- URL externa: somente HTTPS; localhost e esquemas perigosos rejeitados.
- HTML: allowlist, sem scripts/event handlers; iframe sandbox vazio.
- Upload: MIME allowlist, 500 MB, nome normalizado, sufixo aleatório, token emitido após autorização.
- CSP, `nosniff`, política de referência e permissões restritas configuradas.
- Auditoria remove campos compatíveis com senha, token, cookie, segredo e URL assinada.

Antes de produção: `npm audit --omit=dev`, scanner de segredos no CI, DAST apenas contra homologação autorizada e rotação de segredos após incidente.
