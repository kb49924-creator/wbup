#!/usr/bin/env python3
"""
Анализ зависимостей между nmID/vol/part/basket для Wildberries.
Проверяет десятки гипотез о том как вычислить basket детерминированно.
"""

import json
from pathlib import Path
from collections import defaultdict
import hashlib

# ============================================================
# Data Loading
# ============================================================
DATA_FILE = Path("data/images/nmIDs_baskets.json")

def load_data():
    """Загружаем данные из JSON."""
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def compute_vol_part(nm_id):
    """Вычисляем vol и part из nm_id (артикула)."""
    try:
        nm = int(nm_id) if not isinstance(nm_id, int) else nm_id
        vol = nm // 100000
        part = nm // 1000
        return vol, part
    except (ValueError, TypeError):
        return None, None


# ============================================================
# Hypothesis Testing Functions
# ============================================================

def hypothesis_mod_nmid(basket_data):
    """basket = nmID % N"""
    results = {}
    for rec in basket_data:
        nm = int(rec['nmID'])
        actual = rec['basket']
        # Test multiple moduli
        best_match = None
        for n in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 24, 25]:
            pred = nm % n
            if pred == actual:
                if best_match is None or n < best_match[0]:
                    best_match = (n, pred)
        results[str(nm)] = best_match
    return results


def hypothesis_xor(basket_data):
    """basket = (nmID ^ vol) % N или (nmID ^ part) % N"""
    results = {}
    for rec in basket_data:
        nm = int(rec['nmID'])
        vol, part = compute_vol_part(nm)
        actual = rec['basket']
        
        matches = []
        # Try XOR patterns
        for val in [vol, part, nm // 100, nm // 1000]:
            if val is None:
                continue
            xored = nm ^ val
            for n in [25, 24, 23, 22, 21, 20]:
                pred = xored % n
                if pred == actual:
                    matches.append(('nm^val', n))
        
        results[str(nm)] = matches if matches else None
    return results


def hypothesis_div_based(basket_data):
    """basket зависит от nmID // divisor"""
    results = {}
    for rec in basket_data:
        nm = int(rec['nmID'])
        actual = rec['basket']
        
        matches = []
        for div in [100, 1000, 10000, 100000, 50000, 25000]:
            v = nm // div
            for n in [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]:
                pred = v % n
                if pred == actual:
                    matches.append((f"nm//{div}%{n}", pred))
        
        results[str(nm)] = matches if matches else None
    return results


def hypothesis_bitwise(basket_data):
    """basket зависит от битового паттерна nmID"""
    results = {}
    for rec in basket_data:
        nm = int(rec['nmID'])
        actual = rec['basket']
        
        matches = []
        # Last few bits
        for bits in [3, 4, 5, 6]:
            mask = (1 << bits) - 1
            val = nm & mask
            if val == actual:
                matches.append(f"nm&{(2**bits)-1}")
        
        # Right shift then mod
        for shift in [1, 2, 3, 4, 5, 6, 7, 8]:
            shifted = nm >> shift
            for n in [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]:
                pred = shifted % n
                if pred == actual:
                    matches.append(f"(nm>>{shift})%{n}")
        
        results[str(nm)] = matches if matches else None
    return results


def hypothesis_vol_part_combination(basket_data):
    """basket зависит от комбинации vol и part"""
    results = {}
    for rec in basket_data:
        nm = int(rec['nmID'])
        vol, part = compute_vol_part(nm)
        actual = rec['basket']
        
        matches = []
        if vol is None:
            results[str(nm)] = None
            continue
        
        # Combinations
        combos = [
            vol + part,
            vol * part,
            vol ^ part,
            abs(vol - part),
            vol + part % 10,
            (vol * 7 + part * 3) % 100,
            (vol ^ part) % 30,
            (vol * part) % 30,
        ]
        
        for i, combo in enumerate(combos):
            for n in [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]:
                pred = combo % n
                if pred == actual:
                    names = ['v+p', 'v*p', 'v^p', '|v-p|', 'v+(p%10)', '(7v+3p)%100', '(v^p)%30', '(v*p)%30']
                    matches.append(f"{names[i]}%{n}")
        
        results[str(nm)] = matches if matches else None
    return results


def hypothesis_last_digits(basket_data):
    """basket зависит от последних цифр nmID"""
    results = {}
    for rec in basket_data:
        nm = int(rec['nmID'])
        actual = rec['basket']
        s_nm = str(nm)
        
        matches = []
        # Last 1-4 digits as number
        for d in [1, 2, 3, 4]:
            last = int(s_nm[-d:]) if len(s_nm) >= d else 0
            for n in [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]:
                pred = last % n
                if pred == actual:
                    matches.append(f"last{d}%{n}")
        
        # Sum of digits
        digit_sum = sum(int(c) for c in s_nm)
        for n in [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]:
            pred = digit_sum % n
            if pred == actual:
                matches.append(f"sum_digits%{n}")
        
        results[str(nm)] = matches if matches else None
    return results


def hypothesis_comprehensive(basket_data):
    """Комплексная проверка всех простых формул: (a*nm + b*vol + c*part + d) % m"""
    matches_by_record = []
    
    total = len(basket_data)
    found_count = 0
    
    print("\n=== COMPREHENSIVE HYPERPARAMETER SEARCH ===")
    print("Testing: (a*nm + b*vol + c*part + d) % m where a,b,c,d in [-5,5], m in [5,30]")
    print()
    
    formulas_found = {}
    
    for rec_idx, rec in enumerate(basket_data):
        nm = int(rec['nmID'])
        vol, part = compute_vol_part(nm)
        actual = rec['basket']
        
        record_matches = []
        
        if vol is None:
            continue
            
        for a in range(-5, 6):
            for b in range(-5, 6):
                for c in range(-5, 6):
                    for d in range(-5, 6):
                        if a == 0 and b == 0 and c == 0:
                            continue
                        
                        # Compute candidate
                        val = a * nm + b * vol + c * part + d
                        
                        for m in range(5, 31):
                            pred = ((val % m) + m) % m  # Handle negative
                            if pred == actual:
                                formula = f"({a}*nm+{b}*vol+{c}*part+{d})%{m}"
                                record_matches.append(formula)
                                key = formula[:50]
                                if key not in formulas_found:
                                    formulas_found[key] = 0
                                formulas_found[key] += 1
        
        if record_matches:
            found_count += 1
            matches_by_record.append({'nm': str(nm), 'formulas': record_matches[:10]})  # Top 10
        else:
            matches_by_record.append({'nm': str(nm), 'formulas': []})
    
    # Show top formulas that match most records
    print("TOP 30 MOST COMMON FORMULAS:")
    print("=" * 60)
    sorted_formulas = sorted(formulas_found.items(), key=lambda x: -x[1])
    for i, (formula, count) in enumerate(sorted_formulas[:30]):
        pct = count / total * 100
        print(f"{i+1:2d}. {formula}: {count}/{total} ({pct:.1f}%)")
    
    print(f"\nOverall match rate: {found_count}/{total} ({found_count/total*100:.1f}%)")
    
    return matches_by_record, formulas_found


def find_single_formula(basket_data):
    """Ищем ОДНУ формулу которая работает для ВСЕХ записей."""
    print("\n=== SEARCHING FOR UNIVERSAL FORMULA ===")
    print("Looking for: (a*nm + b*vol + c*part + d) % m that works for ALL records")
    print()
    
    total = len(basket_data)
    
    for a in range(-3, 4):
        for b in range(-3, 4):
            for c in range(-3, 4):
                for d in range(-3, 4):
                    if a == 0 and b == 0 and c == 0:
                        continue
                    
                    for m in range(5, 31):
                        all_match = True
                        matching_records = 0
                        
                        for rec in basket_data:
                            nm = int(rec['nmID'])
                            vol, part = compute_vol_part(nm)
                            actual = rec['basket']
                            
                            if vol is None:
                                all_match = False
                                break
                            
                            val = a * nm + b * vol + c * part + d
                            pred = ((val % m) + m) % m
                            
                            if pred != actual:
                                all_match = False
                                break
                            else:
                                matching_records += 1
                        
                        if all_match:
                            formula = f"({a}*nm+{b}*vol+{c}*part+{d})%{m}"
                            print(f"✅ FOUND: {formula}")
                            print(f"   Matches: {matching_records}/{total} (100%)")
                            return formula
        
        if a % 2 == 1:
            print(f"   Tested a up to {a}...")
    
    print("❌ No universal formula found in search space.")
    return None


# ============================================================
# Main Analysis
# ============================================================
def main():
    print("=" * 70)
    print("WB Basket Computation Analyzer")
    print("=" * 70)
    
    data = load_data()
    
    if not data:
        print("No data loaded.")
        print("Create data/images/nmIDs_baskets.json with format:")
        print('[{"nmID": "123456789", "vol": 1, "part": 12345, "basket": 25}, ...]')
        return
    
    print(f"\nLoaded {len(data)} records")
    print("\nSample data:")
    for rec in data[:5]:
        nm = rec['nmID']
        vol, part = compute_vol_part(nm)
        print(f"  nmID={nm} vol={vol} part={part} basket={rec['basket']}")
    
    # Quick check: how many distinct baskets?
    baskets = set(r['basket'] for r in data)
    print(f"\nDistinct baskets: {sorted(baskets)}")
    
    # Run analyses
    print("\n" + "=" * 70)
    
    # 1. Simple modulus
    h1 = hypothesis_mod_nmid(data)
    matches_h1 = sum(1 for v in h1.values() if v)
    print(f"\n1. Simple modulus (nmID % N):")
    print(f"   Matches: {matches_h1}/{len(data)} ({matches_h1/len(data)*100:.1f}%)")
    
    # 2. XOR patterns
    h2 = hypothesis_xor(data)
    matches_h2 = sum(1 for v in h2.values() if v)
    print(f"\n2. XOR patterns:")
    print(f"   Matches: {matches_h2}/{len(data)} ({matches_h2/len(data)*100:.1f}%)")
    
    # 3. Division based
    h3 = hypothesis_div_based(data)
    matches_h3 = sum(1 for v in h3.values() if v)
    print(f"\n3. Division-based:")
    print(f"   Matches: {matches_h3}/{len(data)} ({matches_h3/len(data)*100:.1f}%)")
    
    # 4. Bitwise
    h4 = hypothesis_bitwise(data)
    matches_h4 = sum(1 for v in h4.values() if v)
    print(f"\n4. Bitwise operations:")
    print(f"   Matches: {matches_h4}/{len(data)} ({matches_h4/len(data)*100:.1f}%)")
    
    # 5. Vol-part combinations
    h5 = hypothesis_vol_part_combination(data)
    matches_h5 = sum(1 for v in h5.values() if v)
    print(f"\n5. Vol-part combinations:")
    print(f"   Matches: {matches_h5}/{len(data)} ({matches_h5/len(data)*100:.1f}%)")
    
    # 6. Last digits
    h6 = hypothesis_last_digits(data)
    matches_h6 = sum(1 for v in h6.values() if v)
    print(f"\n6. Last digits:")
    print(f"   Matches: {matches_h6}/{len(data)} ({matches_h6/len(data)*100:.1f}%)")
    
    # 7. Comprehensive search
    _, formulas = hypothesis_comprehensive(data)
    
    # 8. Try to find universal formula
    universal = find_single_formula(data)
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"{'Method':<30} {'Matches':<15} {'Percentage'}")
    print("-" * 70)
    print(f"{'Simple modulus':<30} {matches_h1:<15} {matches_h1/len(data)*100:.1f}%")
    print(f"{'XOR patterns':<30} {matches_h2:<15} {matches_h2/len(data)*100:.1f}%")
    print(f"{'Division-based':<30} {matches_h3:<15} {matches_h3/len(data)*100:.1f}%")
    print(f"{'Bitwise operations':<30} {matches_h4:<15} {matches_h4/len(data)*100:.1f}%")
    print(f"{'Vol-part combinations':<30} {matches_h5:<15} {matches_h5/len(data)*100:.1f}%")
    print(f"{'Last digits':<30} {matches_h6:<15} {matches_h6/len(data)*100:.1f}%")
    print("-" * 70)
    print(f"UNIVERSAL FORMULA: {universal or 'NOT FOUND'}")
    print("=" * 70)


if __name__ == '__main__':
    main()