import csv
import random

# Valid IPsec configurations observed in the dataset
configs = [
    {"config_id": "cfg003", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes256-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg004", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes256-sha256", "dh_group": "modp2048", "pfs": "off", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg002", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "off", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg001", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg007", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes256-sha256", "dh_group": "modp3072", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg008", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes256-sha256", "dh_group": "modp3072", "pfs": "off", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg005", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp3072", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg006", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp3072", "pfs": "off", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg009", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg010", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg011", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg012", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg015", "mode": "transport", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg016", "mode": "tunnel", "ike_version": "ikev2", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg013", "mode": "tunnel", "ike_version": "ikev1", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"},
    {"config_id": "cfg014", "mode": "transport", "ike_version": "ikev1", "cipher": "aes128-sha256", "dh_group": "modp2048", "pfs": "on", "capture_type": "ike_plus_esp", "status": "success"}
]

# Noisy/Real-world traffic bounds (Lots of overlap to confuse the model)
# Format: [packet_min, packet_max, size_min, size_max]
noisy_stats = {
    'icmp':  [10, 200, 1000, 30000],          # Can mimic small web or email requests
    'email': [20, 500, 5000, 300000],         # Bursty, overlaps with voip and web
    'voip':  [50, 1000, 10000, 500000],       # Constant stream, can overlap with web
    'web':   [100, 4000, 30000, 3000000],     # Highly variable, overlaps heavily with video and voip
    'video': [500, 10000, 200000, 15000000]   # Massive ranges, overlaps with heavy web traffic
}

traffic_types = list(noisy_stats.keys())

# If clean is 70,161 records (30%), then 70% noisy is approx 163,709 records.
num_records = 163709
start_index = 100001 # Start index high to prevent name collisions
output_file = 'noisydataset.csv'

columns = ['filename', 'config_id', 'repeat_id', 'mode', 'ike_version', 'cipher', 'dh_group', 'pfs', 'traffic_type', 'capture_type', 'packet_count', 'ike_packet_count', 'esp_packet_count', 'plain_icmp_count', 'pcap_size_bytes', 'status']

with open(output_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    
    for i in range(start_index, start_index + num_records):
        config = random.choice(configs)
        traffic_type = random.choice(traffic_types)
        
        t_stats = noisy_stats[traffic_type]
        
        # Add aggressive overlap and noise
        packet_count = random.randint(t_stats[0], t_stats[1])
        
        # Real-world packet loss / unpredictable IKE negotiations
        ike_packet_count = random.randint(2, 16) 
        
        # Some plain ICMP might slip in during drops or tunnel setup
        plain_icmp_count = random.choices([0, random.randint(1, 10)], weights=[0.9, 0.1])[0]
        
        # ESP is whatever remains of the packets (ensure logical bounds)
        esp_packet_count = max(0, packet_count - ike_packet_count - plain_icmp_count)
        
        # Make total match
        packet_count = ike_packet_count + esp_packet_count + plain_icmp_count
        
        # Pcap size introduces random packet size variance
        pcap_size_bytes = random.randint(t_stats[2], t_stats[3])
        
        # Add occasional massive outliers to completely confuse the model (1% chance)
        if random.random() < 0.01:
            packet_count *= random.randint(2, 5)
            pcap_size_bytes *= random.randint(2, 5)
            esp_packet_count = max(0, packet_count - ike_packet_count - plain_icmp_count)
        
        repeat_id = random.randint(1, 999)
        
        filename = f"{i:06d}_{config['config_id']}_rep{repeat_id:03d}_{config['mode']}_{config['ike_version']}_{config['cipher']}_{config['dh_group']}_pfs{config['pfs']}_noisy_{traffic_type}.pcap"
        
        row = [
            filename, config['config_id'], repeat_id, config['mode'], config['ike_version'], 
            config['cipher'], config['dh_group'], config['pfs'], traffic_type, 
            config['capture_type'], packet_count, ike_packet_count, esp_packet_count, 
            plain_icmp_count, pcap_size_bytes, config['status']
        ]
        
        writer.writerow(row)

print(f"Successfully generated {num_records} noisy records in {output_file}")
