# Render Deployment Optimization Guide

## Issues Fixed for "Too Many Requests" Error

### 1. Database Connection Pool Optimization
- Reduced max connections to 2 for production (was 5)
- Set min connections to 0 to allow scaling down
- Reduced idle timeout to 5 seconds for faster cleanup
- Disabled keepAlive for better connection management
- Added allowExitOnIdle for process cleanup

### 2. Rate Limiting Implementation
- Added custom rate limiting middleware
- Limit: 100 requests per minute per IP
- Only active in production environment
- Returns 429 status with proper error message

### 3. Memory Management
- Memory monitoring with warnings at 400MB
- Automatic garbage collection when available
- Optimized memory limits with --max-old-space-size=512
- Reduced query limits (expenses: 100 → 50)

### 4. Graceful Shutdown
- Proper SIGTERM and SIGINT handling
- Database pool cleanup on shutdown
- 30-second timeout for forced shutdown
- Uncaught exception handling

### 5. Production Build Optimization
- Minified server bundle
- External package bundling
- Optimized memory flags

## Render Environment Variables
Ensure these are set in your Render service:

```
NODE_ENV=production
DATABASE_URL=<your-postgres-url>
```

## Build Command for Render
```bash
npm run build
```

## Start Command for Render
```bash
npm run start
```

## Common Issues and Solutions

### Issue: "Too Many Requests"
**Cause**: Excessive database connections or API calls
**Solution**: Applied connection pooling optimizations and rate limiting

### Issue: Memory Exhaustion
**Cause**: Large data queries or memory leaks
**Solution**: Reduced query limits and added memory monitoring

### Issue: Connection Timeouts
**Cause**: Long-running database connections
**Solution**: Reduced connection timeouts and added cleanup

## Monitoring
- Check Render logs for memory warnings
- Monitor database connection count
- Watch for rate limit triggers

## Performance Tips
1. Use database indexes for frequently queried columns
2. Implement pagination for large datasets
3. Cache frequently accessed data
4. Monitor and optimize slow queries