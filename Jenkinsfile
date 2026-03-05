@Library(['shared-library', 'pipeline-library']) _
def vault = new Vault()

// Cek panduan di wiki berikut: https://gitlab.playcourt.id/devops/devsecops-wiki
PipelineDockerEntryV3([
    // Nama project anda sesuai yang terdaftar di Playcourt. Nama sudah ditentukan di awal, mohon tidak di ubah tanpa komunikasi dengan tim Playcourt.
    projectName: 'legion-ui',

    // Nama dari service yang anda buat dan akan digunakan sebagai nama image docker.
    imageName: 'legion-ui-legionai-dev',

    // Nama cluster di mana service akan dideploy. Deployment sudah ditentukan di awal, mohon tidak di ubah tanpa komunikasi dengan tim Playcourt.
    deployment: 'abcv2',

    // Label dari agent yang akan digunakan untuk menjalankan pipeline, mohon tidak di ubah tanpa komunikasi dengan tim Playcourt.
    agentLabel: 'Docker',

    // Prerun Script
    // Pada bagian ini anda dapat menambahkan dan mengkonfigurasikan script untuk dijalankan sebelum melakukan test atau build service yang anda buat
    prerunScript: {
        // "prerunScript" berisi groovy script yang akan dijalankan sebelum step test dan build
        // Pada bagian ini anda juga dapat membuat variable dan menggunakannya pada script yang lain

        // contoh script untuk mengambil secret dari Vault dan menyimpannya ke dalam file .env:
        // useDotenv = vault.createDotenv("ins/instest/${env.BRANCH_NAME}/example")

        DEFAULT_NUM_CTX = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'DEFAULT_NUM_CTX')
        MIDAS_API_BASE_URL = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MIDAS_API_BASE_URL')
        MIDAS_API_KEY = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MIDAS_API_KEY')
        OPENAI_LIKE_API_BASE_URL = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'OPENAI_LIKE_API_BASE_URL')
        OPENAI_LIKE_API_KEY = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'OPENAI_LIKE_API_KEY')
        SESSION_SECRET = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'SESSION_SECRET')
        VITE_AZURE_CLIENT_ID = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_AZURE_CLIENT_ID')
        VITE_AZURE_CLIENT_SECRET = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_AZURE_CLIENT_SECRET')
        VITE_AZURE_REDIRECT_URI = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_AZURE_REDIRECT_URI')
        VITE_AZURE_TENANT_ID = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_AZURE_TENANT_ID')
        VITE_BASE_URL= vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_BASE_URL')
        VITE_DEFAULT_MODEL = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_DEFAULT_MODEL')
        VITE_DEFAULT_PROVIDER = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_DEFAULT_PROVIDER')
        VITE_DEFAULT_THEME = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_DEFAULT_THEME')
        NODE_ENV = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'NODE_ENV')
        VITE_GITHUB_ACCESS_TOKEN = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_GITHUB_ACCESS_TOKEN')
        VITE_GITHUB_TOKEN_TYPE = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_GITHUB_TOKEN_TYPE')
        VITE_LOG_LEVEL = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'VITE_LOG_LEVEL')
        MONGODB_URI = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MONGODB_URI')
        MONGODB_MAX_POOL_SIZE = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MONGODB_MAX_POOL_SIZE')
        MONGODB_MIN_POOL_SIZE = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MONGODB_MIN_POOL_SIZE')
        MONGODB_SOCKET_TIMEOUT_MS = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MONGODB_SOCKET_TIMEOUT_MS')
        MONGODB_CONNECT_TIMEOUT_MS = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MONGODB_CONNECT_TIMEOUT_MS')
        MONGODB_KEEP_ALIVE = vault.vault('dpe/legion-ui/release/legion-ui-legionai-dev', 'MONGODB_KEEP_ALIVE')
    },

    // Service Test
    // Pada bagian ini anda dapat menambahkan dan mengkonfigurasikan script untuk menjalankan test pada service yang anda buat
    testAgentImage: 'playcourt/jenkins:nodejs20', // Untuk option ini, hanya gunakan image dari https://hub.docker.com/r/playcourt/jenkins
    runTestScript: {
        // "runTestScript" berisi groovy script untuk menjalankan test
        // contoh script untuk menjalankan test pada service nodejs
        // sh "npm ci"
        // sh "npm run test"
    },

    // Build Docker Image
    // Pada bagian ini anda dapat mengkonfigurasikan script untuk membuat image dari service yang anda buat
    buildDockerImageScript: { String imageTag, String envStage, String buildCommand ->
        // "buildDockerImageScript" berisi groovy script untuk melakukan build image
        // Wajib menggunakan variable buildCommand untuk menjalankan perintah docker build
        // Image yang dibuat wajib menggunakan tag dari variable imageTag

        // Build image sesuai target menggunakan buildCommand dari pipeline library
        sh "${buildCommand} \
            --build-arg ARGS_NODE_BUILD=${envStage} \
            --build-arg MIDAS_API_BASE_URL=${MIDAS_API_BASE_URL} \
            --build-arg MIDAS_API_KEY=${MIDAS_API_KEY} \
            --build-arg DEFAULT_NUM_CTX=${DEFAULT_NUM_CTX} \
            --build-arg OPENAI_LIKE_API_BASE_URL=${OPENAI_LIKE_API_BASE_URL} \
            --build-arg OPENAI_LIKE_API_KEY=${OPENAI_LIKE_API_KEY} \
            --build-arg SESSION_SECRET=${SESSION_SECRET} \
            --build-arg VITE_AZURE_CLIENT_ID=${VITE_AZURE_CLIENT_ID} \
            --build-arg VITE_AZURE_CLIENT_SECRET=${VITE_AZURE_CLIENT_SECRET} \
            --build-arg VITE_AZURE_REDIRECT_URI=${VITE_AZURE_REDIRECT_URI} \
            --build-arg VITE_AZURE_TENANT_ID=${VITE_AZURE_TENANT_ID} \
            --build-arg VITE_BASE_URL=${VITE_BASE_URL} \
            --build-arg VITE_DEFAULT_MODEL=${VITE_DEFAULT_MODEL} \
            --build-arg VITE_DEFAULT_PROVIDER=${VITE_DEFAULT_PROVIDER} \
            --build-arg VITE_DEFAULT_THEME=${VITE_DEFAULT_THEME} \
            --build-arg RUNNING_IN_DOCKER=true \
            --build-arg NODE_ENV=${NODE_ENV} \
            --build-arg VITE_GITHUB_ACCESS_TOKEN=${VITE_GITHUB_ACCESS_TOKEN} \
            --build-arg VITE_GITHUB_TOKEN_TYPE=${VITE_GITHUB_TOKEN_TYPE} \
            --build-arg VITE_LOG_LEVEL=${VITE_LOG_LEVEL} \
            --build-arg MONGODB_URI=${MONGODB_URI} \
            --build-arg MONGODB_MAX_POOL_SIZE=${MONGODB_MAX_POOL_SIZE} \
            --build-arg MONGODB_MIN_POOL_SIZE=${MONGODB_MIN_POOL_SIZE} \
            --build-arg MONGODB_SOCKET_TIMEOUT_MS=${MONGODB_SOCKET_TIMEOUT_MS} \
            --build-arg MONGODB_CONNECT_TIMEOUT_MS=${MONGODB_CONNECT_TIMEOUT_MS} \
            --build-arg MONGODB_KEEP_ALIVE=${MONGODB_KEEP_ALIVE} \
            --target bolt-ai-production -t ${imageTag} ."
    },

    // Post Run Script
    // Pada bagian ini anda dapat menambahkan script untuk dijalankan setelah proses pada pipeline selesai
    postrunScript: [
        always: {
            // Pada bagian ini script akan dijalankan setiap pipeline selesai
        },

        success: {
            // Pada bagian ini script hanya akan dijalankan jika pipeline sukses
        },

        failure: {
            // Pada bagian ini script hanya akan dijalankan jika pipeline gagal
        }
    ]
])
