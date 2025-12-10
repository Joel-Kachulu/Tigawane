import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Health check endpoint
 * Returns 200 if the app and database are healthy
 * Useful for monitoring and load balancers
 */
export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    const { error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const dbLatency = Date.now() - startTime;
    
    if (dbError) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: {
            status: 'error',
            error: dbError.message,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json({
      status: 'healthy',
      database: {
        status: 'connected',
        latency: `${dbLatency}ms`,
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

