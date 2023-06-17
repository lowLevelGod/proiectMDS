export const swaggerDocument = {
    openapi: '3.0.1',
    info: {
        version: '1.0.0',
        title: 'APIs Document',
        description: 'Social media app',
        termsOfService: '',
        contact: {
            name: 'Brontosaurus',
            email: 'brontosaurus@dino.com',
            url: ''
        },
        license: {
            name: 'Apache 2.0',
            url: 'https://www.apache.org/licenses/LICENSE-2.0.html'
        }
    },

    servers: [
        {
            url: "https://localhost:8080",
        },
    ],
    apis: ["../app/routes/AuthenticationRoutes.ts"],
};