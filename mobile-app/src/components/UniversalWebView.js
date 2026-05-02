import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const UniversalWebView = forwardRef(({ source, onMessage, style, ...props }, ref) => {
  const webRef = useRef(null);
  const nativeRef = useRef(null);
  const pendingMsg = useRef(null);
  const retryTimer = useRef(null);

  const trySendMsg = () => {
    if (!pendingMsg.current) return;
    if (!webRef.current || !webRef.current.contentWindow) return;
    
    try {
      // Check if iframe is ready (handleSync exists on window)
      const isReady = webRef.current.contentWindow.handleSync;
      if (!isReady) {
        // Not ready yet, retry in 200ms
        retryTimer.current = setTimeout(trySendMsg, 200);
        return;
      }
      // Parse and send
      const data = JSON.parse(pendingMsg.current);
      webRef.current.contentWindow.handleSync(data);
      pendingMsg.current = null;
    } catch (e) {
      // Retry on any error
      retryTimer.current = setTimeout(trySendMsg, 200);
    }
  };

  useImperativeHandle(ref, () => ({
    injectJavaScript: (code) => {
      if (Platform.OS === 'web') {
        if (webRef.current && webRef.current.contentWindow) {
           try {
               webRef.current.contentWindow.eval(code);
           } catch (e) {
               console.error("Web inject error", e);
           }
        }
      } else {
        nativeRef.current?.injectJavaScript(code);
      }
    },
    postMessage: (msg) => {
        if (Platform.OS === 'web') {
            // Store the latest message and try to deliver it
            pendingMsg.current = msg;
            if (retryTimer.current) clearTimeout(retryTimer.current);
            trySendMsg();
        } else {
            nativeRef.current?.postMessage(msg);
        }
    },
    reload: () => {
        if (Platform.OS === 'web') {
             if (webRef.current) {
                 webRef.current.srcdoc = webRef.current.srcdoc;
             }
        } else {
            nativeRef.current?.reload();
        }
    }
  }));

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleMessage = (event) => {
         try {
            const data = event.data;
            if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
                if (onMessage) {
                    onMessage({ nativeEvent: { data } });
                }
            }
         } catch (e) {}
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [onMessage]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web' && source?.html) {
      const blob = new Blob([source.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [source?.html]);

  if (Platform.OS === 'web') {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        {blobUrl ? (
          <iframe
            key={blobUrl}
            ref={webRef}
            src={blobUrl}
            style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'auto' }}
            allow="geolocation; microphone; camera; midi; encrypted-media;"
            referrerPolicy="no-referrer-when-downgrade"
            title="Map"
          />
        ) : (
          <View style={[style, { backgroundColor: '#0F0E0B' }]} />
        )}
      </View>
    );
  }

  return (
    <WebView
      ref={nativeRef}
      source={source}
      onMessage={onMessage}
      style={style}
      {...props}
    />
  );
});

export default UniversalWebView;
