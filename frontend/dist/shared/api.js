/**
 * SPanel API Client - Static HTML Pages
 *
 * Provides a simple fetch wrapper with automatic 401 handling
 * for static HTML pages that use native fetch API.
 */

/**
 * Enhanced fetch with automatic 401 handling
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithAuth(url, options = {}) {
    // Add Authorization header if token exists
    const token = localStorage.getItem('spanel_jwt_token');

    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    // Make the request
    const response = await fetch(url, options);

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
        localStorage.removeItem('spanel_jwt_token');
        window.location.href = '/auth/login.html';
        throw new Error('Unauthorized - redirecting to login');
    }

    return response;
}

/**
 * Convenience method for GET requests
 */
async function get(url, options = {}) {
    return fetchWithAuth(url, {
        ...options,
        method: 'GET'
    });
}

/**
 * Convenience method for POST requests
 */
async function post(url, data, options = {}) {
    return fetchWithAuth(url, {
        ...options,
        method: 'POST',
        headers: {
            ...options.headers,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

/**
 * Convenience method for PUT requests
 */
async function put(url, data, options = {}) {
    return fetchWithAuth(url, {
        ...options,
        method: 'PUT',
        headers: {
            ...options.headers,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

/**
 * Convenience method for DELETE requests
 */
async function del(url, data, options = {}) {
    const requestOptions = {
        ...options,
        method: 'DELETE'
    };

    // Add body if data is provided
    if (data) {
        requestOptions.headers = {
            ...options.headers,
            'Content-Type': 'application/json'
        };
        requestOptions.body = JSON.stringify(data);
    }

    return fetchWithAuth(url, requestOptions);
}

// Export to global scope
window.SPanelAPI = {
    fetch: fetchWithAuth,
    get,
    post,
    put,
    delete: del
};
