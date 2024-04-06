/**
 * @class ApiResponse
 * @description Represents the structure of API responses with a standardized format.
 */

class ApiResponse {
    /**
     * @constructor
     * @param {number} statusCode - HTTP status code of the response.
     * @param {any} data - Data to be included in the response.
     * @param {string} [message='Success'] - Message describing the result of the response.
     */

    constructor(statusCode, data, message = 'Success'){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400
    }
}


// Example Usage:
// const response = new ApiResponse(200, { key: 'value' }, 'Operation successful');
// console.log(response);

module.exports = { ApiResponse}