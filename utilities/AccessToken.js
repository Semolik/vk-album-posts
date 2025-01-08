export const retrieveAccessToken = () => {
    const regex = /^\d+:web_token:login:auth$/;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (regex.test(key)) {
            const tokenData = JSON.parse(localStorage.getItem(key));
            if (tokenData && tokenData.access_token) {
                return tokenData.access_token;
            }
        }
    }
};
