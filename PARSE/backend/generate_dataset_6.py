import csv
import random

# Traffic type ranges for numeric columns based on analysis of dataset 1 to 4
# [packet_min, packet_max, ike_min, ike_max, esp_min, esp_max, size_min, size_max]
traffic_stats = {
    'email': [78, 93, 4, 4, 72, 89, 79048, 81514],
    'icmp': [34, 43, 4, 9, 30, 30, 7676, 8850],
    'video': [1908, 2017, 4, 4, 1904, 2011, 2379520, 2396358],
    'voip': [124, 124, 4, 4, 120, 120, 42176, 42176],
    'web': [534, 602, 4, 4, 528, 594, 605832, 616228]
}

# Valid IPsec configurations observed in dataset 1 to 4
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

traffic_types = list(traffic_stats.keys())

num_records = 50000
start_index = 20001
output_file = 'dataset_labels_phase6.csv'

# Define columns in exactly the same order
columns = ['filename', 'config_id', 'repeat_id', 'mode', 'ike_version', 'cipher', 'dh_group', 'pfs', 'traffic_type', 'capture_type', 'packet_count', 'ike_packet_count', 'esp_packet_count', 'plain_icmp_count', 'pcap_size_bytes', 'status']

with open(output_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(columns)
    
    for i in range(start_index, start_index + num_records):
        config = random.choice(configs)
        traffic_type = random.choice(traffic_types)
        
        t_stats = traffic_stats[traffic_type]
        
        # Generate logically bounded values
        packet_count = random.randint(t_stats[0], t_stats[1])
        ike_packet_count = random.randint(t_stats[2], t_stats[3])
        esp_packet_count = random.randint(t_stats[4], t_stats[5])
        plain_icmp_count = 0
        pcap_size_bytes = random.randint(t_stats[6], t_stats[7])
        
        # In rare cases, make sure ike + esp + plain_icmp <= packet_count
        if (ike_packet_count + esp_packet_count + plain_icmp_count) > packet_count:
            packet_count = ike_packet_count + esp_packet_count + plain_icmp_count
        
        repeat_id = random.randint(1, 100)
        
        # filename structure mimic
        # e.g., 20001_cfg003_rep10_tunnel_ikev2_aes256-sha256_modp2048_pfson_icmp.pcap
        filename = f"{i:05d}_{config['config_id']}_rep{repeat_id:02d}_{config['mode']}_{config['ike_version']}_{config['cipher']}_{config['dh_group']}_pfs{config['pfs']}_{traffic_type}.pcap"
        
        row = [
            filename,
            config['config_id'],
            repeat_id,
            config['mode'],
            config['ike_version'],
            config['cipher'],
            config['dh_group'],
            config['pfs'],
            traffic_type,
            config['capture_type'],
            packet_count,
            ike_packet_count,
            esp_packet_count,
            plain_icmp_count,
            pcap_size_bytes,
            config['status']
        ]
        
        writer.writerow(row)

print(f"Successfully generated {num_records} records in {output_file}")
