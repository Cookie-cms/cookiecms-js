function createResponse(error = false, msg = '', url = null, data = {}) {
    return {
        error: error,
        msg: msg,
        url: url,
        data: data
    };
}

export default createResponse;