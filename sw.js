// The "Mini-Server" Logic
let fileData = null;
let password = null;

self.addEventListener('message', (event) => {
    if (event.data.type === 'START_STREAM') {
        fileData = event.data.file;
        password = event.data.pass;
    }
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/download-stream/')) {
        const key = new TextEncoder().encode(password);
        let offset = 0;

        const stream = new ReadableStream({
            async start(controller) {
                const reader = fileData.stream().getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        break;
                    }
                    
                    // Scramble the chunk before sending it to the "Link"
                    const chunk = new Uint8Array(value);
                    for (let i = 0; i < chunk.length; i++) {
                        chunk[i] ^= key[(offset + i) % key.length];
                    }
                    offset += chunk.length;
                    controller.enqueue(chunk);
                }
            }
        });

        // Tell the browser: "Treat this link as a file download"
        event.respondWith(new Response(stream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="encrypted_data"`,
                'Content-Length': fileData.size
            }
        }));
    }
});
