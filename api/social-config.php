<?php
// Configuration for Social Media Scraping
// We recommend using Apify (https://apify.com) for reliable Facebook scraping.
// You need to sign up for an API key.

define('APIFY_API_TOKEN', 'apify_api_fpRbYP9Dsh7Dc8P1aVcmt34HsvDHcN1sd0OH'); // ENTER YOUR APIFY TOKEN HERE
define('APIFY_FACEBOOK_ACTOR', 'apify/facebook-posts-scraper'); // Or 'apify/facebook-pages-scraper'

// List of Barangays in Santa Cruz, Laguna for targeted search/mocking
$barangays = [
    "Alipit", "Bagumbayan", "Bubukal", "Calios", "Duhat", 
    "Gatid", "Jasaan", "Labuin", "Malinao", "Malinta", 
    "Masapang", "Oogong", "Pagsawitan", "Palasan", "Patimbao", 
    "Poblacion I", "Poblacion II", "Poblacion III", "Poblacion IV", "Poblacion V", 
    "San Jose", "San Juan", "Santa Catalina", "Santo Angel", "Santisima Cruz"
];

// Keywords for flood detection
$flood_keywords = [
    'flood', 'baha', 'lubog', 'water level', 'taas ng tubig', 
    'overflow', 'stranded', 'rescue', 'evacuate', 'evacuation',
    'relief', 'stranded', 'ulan', 'bagyo', 'typhoon'
];

// Known Official Pages (examples - user should update these)
$official_pages = [
    "MDRRMO Santa Cruz",
    "Santa Cruz Laguna Public Information Office",
    "Mayor's Office of Santa Cruz",
    "Laguna Provincial Disaster Risk Reduction and Management Office"
];
?>
