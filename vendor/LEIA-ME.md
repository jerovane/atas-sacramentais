# vendor/

`pdfkit.standalone.js` é a versão para navegador do **pdfkit 0.20.2** (MIT, `pdfkit.LICENSE`), copiada sem alteração de
`node_modules/pdfkit/js/pdfkit.standalone.js`. Já traz dentro as bibliotecas de que o pdfkit depende (fontkit, linebreak,
png-js, pako, brotli e outras, todas de licença livre).

Ela é carregada **só quando alguém pede o primeiro PDF** (1,4 MB), e não ao abrir o site.

Para atualizar: `npm install pdfkit@<versão>` e copie o arquivo de novo (`npm test` confere que o caderno continua saindo igual).
