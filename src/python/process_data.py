# python/process_data.py
import sys
import json

def main():
    data = json.loads(sys.argv[1])
    count = len(data)
    print(count)

if __name__ == "__main__":
    main()
