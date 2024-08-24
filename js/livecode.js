const textarea = document.getElementById('code');
const iframe = document.getElementById('output');

const savedCode = localStorage.getItem('livecode') || '';
textarea.value = savedCode;

function saveCode() {
    localStorage.setItem('livecode', textarea.value);
}

textarea.addEventListener('input', () => {
    const code = textarea.value;
    iframe.srcdoc = `
        <html>
            <head></head>
            <body>${code}</body>
            <script>${code}<\/script>
        </html>
    `;
    saveCode();
});
