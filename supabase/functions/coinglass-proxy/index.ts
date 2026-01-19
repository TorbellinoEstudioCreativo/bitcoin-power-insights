import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const COINGLASS_API_KEY = Deno.env.get('COINGLASS_API_KEY');
const COINGLASS_BASE_URL = 'https://open-api-v3.coinglass.com';

// In-memory cache (valid during edge function lifecycle)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!COINGLASS_API_KEY) {
      console.error('[Coinglass Proxy] Missing COINGLASS_API_KEY');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { endpoint, params } = await req.json();
    
    // Allowed endpoints for Coinglass API v3 (open-api-v3)
    const allowedEndpoints = [
      // Liquidation endpoints
      '/api/futures/liquidation/v2/history',
      '/api/futures/liquidation/info',
      '/api/futures/liquidation/order',
      '/api/futures/liquidation/detail',
      '/api/futures/liquidation/aggregated-heatmap',
      '/api/futures/liquidation/model',
      // Long/Short ratio endpoints
      '/api/futures/globalLongShortAccountRatio/history',
      '/api/futures/topLongShortAccountRatio/history',
      '/api/futures/topLongShortPositionRatio/history',
      // Open Interest endpoints
      '/api/futures/openInterest/ohlc-history',
      '/api/futures/openInterest/ohlc-aggregated-history',
      // Funding Rate endpoints
      '/api/futures/fundingRate/ohlc-history',
      '/api/futures/fundingRate/current'
    ];
    
    if (!allowedEndpoints.includes(endpoint)) {
      console.warn('[Coinglass Proxy] Blocked endpoint:', endpoint);
      return new Response(
        JSON.stringify({ error: 'Endpoint not allowed', endpoint, allowed: allowedEndpoints }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build cache key
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[Coinglass Proxy] Cache HIT:', cacheKey);
      return new Response(
        JSON.stringify({ ...cached.data as object, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build URL with params
    const url = new URL(`${COINGLASS_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    console.log('[Coinglass Proxy] Fetching:', url.toString());
    
    // Fetch from Coinglass API v3
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'CG-API-KEY': COINGLASS_API_KEY,
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Coinglass Proxy] API Error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Coinglass API error', 
          status: response.status,
          message: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    
    // Coinglass API returns { code, msg, data } structure
    if (data.code !== undefined && data.code !== '0' && data.code !== 0) {
      console.error('[Coinglass Proxy] API returned error code:', data.code, data.msg);
      return new Response(
        JSON.stringify({ 
          error: 'Coinglass API error', 
          code: data.code,
          message: data.msg || 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now() });
    console.log('[Coinglass Proxy] Cache SET:', cacheKey, '- Data points:', 
      Array.isArray(data.data) ? data.data.length : 'object');
    
    // Return data
    return new Response(
      JSON.stringify({ ...data, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Coinglass Proxy] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
