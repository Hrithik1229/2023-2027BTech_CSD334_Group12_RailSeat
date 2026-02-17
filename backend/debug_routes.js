import app from './src/app.js';

function printRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            console.log(`${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle.stack) {
            const regexp = layer.regexp.toString();
            // Extract path from regex if possible, usually /^\/api\/admin\/?(?=\/|$)/i
            // simplified:
            console.log(`${prefix}Router: ${regexp}`);
            printRoutes(layer.handle.stack, prefix + '  ');
        }
    });
}

if (app._router && app._router.stack) {
    printRoutes(app._router.stack);
} else {
    console.log("No router stack found");
}
