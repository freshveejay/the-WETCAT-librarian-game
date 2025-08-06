# World ID Integration Guide for WETCAT Librarian

This comprehensive guide will walk you through registering WETCAT Librarian with World ID and preparing it for the World App Store.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Creating a World ID Developer Account](#creating-a-world-id-developer-account)
3. [Registering Your App](#registering-your-app)
4. [Configuring Your Action](#configuring-your-action)
5. [Getting Your APP_ID](#getting-your-app_id)
6. [Testing with the Simulator](#testing-with-the-simulator)
7. [Updating Your Code](#updating-your-code)
8. [World App Store Preparation](#world-app-store-preparation)
9. [Asset Requirements](#asset-requirements)
10. [Submission Checklist](#submission-checklist)

## Prerequisites

Before starting, ensure you have:
- A GitHub account (for authentication)
- Your app running locally or deployed
- Basic understanding of React/JavaScript
- Image editing software for creating app icons

## Creating a World ID Developer Account

1. **Navigate to the Developer Portal**
   - Go to [https://developer.worldcoin.org](https://developer.worldcoin.org)
   - Click "Sign in with GitHub"

2. **Complete Your Profile**
   - Fill in your developer information
   - Accept the terms of service
   - Verify your email if prompted

3. **Access the Dashboard**
   - You'll be redirected to the Developer Dashboard
   - This is where you'll manage all your World ID apps

## Registering Your App

1. **Create a New App**
   - Click "Create New App" button
   - Fill in the following information:
     - **App Name**: WETCAT Librarian
     - **App Description**: A strategic puzzle game where players collect WETCAT tokens while exploring underwater worlds
     - **App URL**: Your production URL (e.g., https://wetcat-librarian.com)
     - **Redirect URL**: https://your-domain.com/auth/callback (for OAuth flows)

2. **Select App Type**
   - Choose "World App Store App" as the app type
   - This enables integration with the World App

3. **Configure Verification Levels**
   - Enable "Orb" verification (highest security)
   - Optionally enable "Device" verification for broader accessibility

## Configuring Your Action

Actions define what users are verifying for in your app.

1. **Create an Action**
   - In your app dashboard, go to "Actions" tab
   - Click "Create Action"
   - Fill in:
     - **Action ID**: `play_wetcat_game`
     - **Action Description**: "Verify to play WETCAT Librarian and earn double rewards"
     - **Max Verifications**: 1 (for unique human verification)

2. **Set Action Parameters**
   - **Signal**: Optional data you want to include (e.g., "wetcat_game_session")
   - **Verification Level**: Set to "Orb" for maximum security

## Getting Your APP_ID

1. **Locate Your APP_ID**
   - In the app dashboard, find the "App ID" section
   - It will look like: `app_staging_a1b2c3d4e5f6` or `app_a1b2c3d4e5f6`
   - Copy this ID - you'll need it for your code

2. **Environment Types**
   - `app_staging_` prefix: For development/staging
   - `app_` prefix: For production
   - Start with staging for testing

## Testing with the Simulator

World ID provides a simulator for testing without real verification.

1. **Access the Simulator**
   - Go to [https://simulator.worldcoin.org](https://simulator.worldcoin.org)
   - Or find the link in your app dashboard

2. **Configure Simulator**
   - Enter your App ID
   - Select verification level (Orb/Device)
   - Choose a test identity

3. **Test Your Integration**
   - Open your app in a browser
   - Click the World ID verification button
   - The simulator will simulate a successful verification
   - Check console logs for verification response

4. **Common Test Scenarios**
   - Successful verification
   - User cancellation
   - Already verified user
   - Network errors

## Updating Your Code

1. **Update WorldIDIntegration.js**
   Replace the placeholder APP_ID with your actual App ID:

   ```javascript
   // Replace this line:
   this.APP_ID = 'app_staging_YOUR_APP_ID'; // TODO: Replace with your World ID app ID
   
   // With your actual App ID:
   this.APP_ID = 'app_staging_a1b2c3d4e5f6'; // Your actual App ID
   ```

2. **Install Dependencies**
   ```bash
   npm install @worldcoin/idkit
   ```

3. **Update the Import**
   Uncomment the import at the top of WorldIDIntegration.js:
   ```javascript
   import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
   ```

4. **Backend Verification Endpoint**
   Create `/api/verify-worldid` endpoint to verify proofs server-side:
   ```javascript
   // Example endpoint (Node.js/Express)
   app.post('/api/verify-worldid', async (req, res) => {
     const { proof, merkle_root, nullifier_hash, verification_level, action, signal } = req.body;
     
     // Verify with World ID API
     const verifyRes = await fetch('https://developer.worldcoin.org/api/v1/verify', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         action_id: action,
         signal: signal,
         proof: proof,
         nullifier_hash: nullifier_hash,
         merkle_root: merkle_root,
         verification_level: verification_level,
       }),
     });
     
     const data = await verifyRes.json();
     res.json({ verified: data.success });
   });
   ```

## World App Store Preparation

1. **App Manifest Configuration**
   - Use the `world-app-manifest.json` file created in this guide
   - Host it at: `https://your-domain.com/.well-known/world-app-manifest.json`
   - Ensure it's publicly accessible

2. **Deep Linking Setup**
   - Configure your app to handle `worldapp://` deep links
   - Set up URL schemes for iOS/Android if building native apps

3. **World App Integration**
   - Test that your app detects when running inside World App
   - Ensure the native bridge communication works
   - Verify the in-app verification flow

## Asset Requirements

1. **App Icon**
   - **Size**: 1024x1024px
   - **Format**: PNG with transparency
   - **Style**: Clear, recognizable, follows World App design guidelines
   - Create versions: 512x512, 256x256, 128x128

2. **Screenshots**
   - **Minimum**: 3 screenshots
   - **Recommended**: 5-8 screenshots
   - **Sizes**: 
     - Phone: 1290x2796px (iPhone 15 Pro Max)
     - Tablet: 2048x2732px (iPad Pro)
   - **Content**: Show gameplay, rewards, World ID integration

3. **Promotional Images**
   - **Feature Graphic**: 1024x500px
   - **Banner**: 1920x1080px
   - Show WETCAT theme and underwater world

4. **App Store Listing**
   - **Title**: WETCAT Librarian - Underwater Puzzle Adventure
   - **Short Description**: Collect WETCAT tokens in this strategic underwater puzzle game
   - **Categories**: Games, Puzzle, Strategy
   - **Keywords**: WETCAT, puzzle, underwater, tokens, rewards, Web3

## Submission Checklist

### Pre-Submission
- [ ] App ID configured in code
- [ ] World ID SDK installed and imported
- [ ] Backend verification endpoint created
- [ ] App manifest hosted at correct URL
- [ ] All assets created and optimized
- [ ] Tested in World ID Simulator
- [ ] Tested Orb verification flow
- [ ] Rewards multiplier working correctly

### Technical Requirements
- [ ] HTTPS enabled on all endpoints
- [ ] CORS configured for World App domain
- [ ] Error handling for failed verifications
- [ ] Graceful fallback for non-verified users
- [ ] Rate limiting on verification endpoint

### World App Store Requirements
- [ ] App manifest validates correctly
- [ ] Deep links configured
- [ ] Native World App detection working
- [ ] Screenshots showcase World ID integration
- [ ] Privacy policy includes World ID data usage
- [ ] Terms of service updated

### Final Steps
1. **Submit for Review**
   - Log into Developer Portal
   - Go to "World App Store" section
   - Click "Submit for Review"
   - Fill in all required information

2. **Review Process**
   - Initial review: 2-3 business days
   - You may receive feedback for changes
   - Make requested updates promptly

3. **Post-Approval**
   - Your app will appear in World App Store
   - Monitor analytics in Developer Portal
   - Collect user feedback and iterate

## Common Issues and Solutions

### Issue: Verification failing in production
**Solution**: Ensure your production APP_ID is correct and backend is verifying against production endpoints

### Issue: App not detected in World App
**Solution**: Check manifest URL is accessible and correctly formatted

### Issue: Users can't claim rewards
**Solution**: Verify nullifier_hash is being stored and checked correctly to prevent double claims

### Issue: Simulator not working
**Solution**: Check browser console for CORS errors, ensure you're using HTTPS in production

## Support Resources

- **Documentation**: [https://docs.worldcoin.org](https://docs.worldcoin.org)
- **Developer Discord**: [https://discord.gg/worldcoin](https://discord.gg/worldcoin)
- **GitHub Examples**: [https://github.com/worldcoin/idkit-js](https://github.com/worldcoin/idkit-js)
- **Support Email**: developer-support@worldcoin.org

## Next Steps

1. Complete the integration following this guide
2. Test thoroughly with the simulator
3. Deploy to staging environment
4. Test with real World ID app (beta testers)
5. Submit to World App Store
6. Launch and promote your verified game!

Remember: World ID verification ensures each player is a unique human, making your game economy more fair and resistant to bots. Use this power responsibly and create an amazing experience for your players!