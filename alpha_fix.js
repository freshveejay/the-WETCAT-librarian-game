// WETCAT Alpha Fix Script
// This script ensures the game runs with all the new assets

console.log('🚀 WETCAT ALPHA FIX LOADING...');

// Override asset loader to handle missing assets gracefully
if (window.game && window.game.assetLoader) {
    const originalGetImage = window.game.assetLoader.getImage.bind(window.game.assetLoader);
    
    window.game.assetLoader.getImage = function(name) {
        const img = originalGetImage(name);
        if (!img) {
            console.warn(`Missing asset: ${name}`);
            // Return a placeholder
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f0f';
            ctx.fillRect(0, 0, 64, 80);
            ctx.fillStyle = '#fff';
            ctx.fillText(name, 5, 40);
            
            const placeholder = new Image();
            placeholder.src = canvas.toDataURL();
            return placeholder;
        }
        return img;
    };
}

// Add debug info to window
window.WETCAT_DEBUG = {
    checkAssets: () => {
        const assetLoader = window.game?.assetLoader;
        if (!assetLoader) {
            console.log('Asset loader not found');
            return;
        }
        
        console.log('Loaded assets:');
        assetLoader.assets.forEach((value, key) => {
            console.log(`  ${key}: ${value ? '✓' : '✗'}`);
        });
    },
    
    getPlayerInfo: () => {
        const player = window.game?.stateManager?.currentState?.player;
        if (!player) {
            console.log('Player not found');
            return;
        }
        
        return {
            position: { x: player.x, y: player.y },
            velocity: { x: player.vx, y: player.vy },
            facing: player.facing,
            isMoving: player.isMoving,
            animationFrame: player.animationFrame
        };
    }
};

console.log('✅ WETCAT ALPHA FIX LOADED!');
console.log('Debug commands available:');
console.log('  WETCAT_DEBUG.checkAssets()');
console.log('  WETCAT_DEBUG.getPlayerInfo()');