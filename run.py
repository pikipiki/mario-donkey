#!/usr/bin/env python3
import argparse
from pathlib import Path

def main():
    parser=argparse.ArgumentParser(description='DKC characters in Yoshi\u2019s Island level 1-1 (prototype)')
    parser.add_argument('--character',choices=['dk','diddy'],default='dk')
    args=parser.parse_args()
    from bridge.window import run
    run(Path(__file__).resolve().parent,args.character)

if __name__=='__main__':main()
