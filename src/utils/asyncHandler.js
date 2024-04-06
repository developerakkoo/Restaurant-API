/**
 * @function asyncHandler
 * @description Wraps an asynchronous route handler to ensure proper error handling.
 * @param {function} requestHandler - Asynchronous route handler function.
 * @returns {function} Express middleware function with error handling.
 */

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

/* Example Usage:
* const asyncRouteHandler = asyncHandler(async (req, res, next) => {
*      Asynchronous operations
* });
* router.get('/example', asyncRouteHandler);
*/

module.exports = {
    asyncHandler
}