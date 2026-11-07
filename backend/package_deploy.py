import os
import zipfile
import sys

def package():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(base_dir, 'deploy.zip')
    
    if os.path.exists(zip_path):
        os.remove(zip_path)
        print(f"Eliminado zip previo: {zip_path}")
        
    print(f"Creando paquete de despliegue POSIX en: {zip_path}")
    
    # Lista de elementos a empaquetar
    items_to_zip = [
        ('dist', True),
        ('node_modules', True),
        ('proto', True),
        ('package.json', False),
        ('package-lock.json', False),
        ('alojamientos-openapi-v2.yaml', False),
    ]
    
    total_files = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as zipf:
        for item_name, is_dir in items_to_zip:
            src_path = os.path.join(base_dir, item_name)
            
            # Si el openapi yaml no está en backend, buscarlo en la raíz del proyecto
            if item_name == 'alojamientos-openapi-v2.yaml' and not os.path.exists(src_path):
                alt_path = os.path.join(base_dir, '..', item_name)
                if os.path.exists(alt_path):
                    src_path = alt_path
            
            if not os.path.exists(src_path):
                print(f"[SKIP] No encontrado: {item_name}")
                continue
                
            if is_dir:
                print(f"Empaquetando directorio: {item_name} ...")
                for root, dirs, files in os.walk(src_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, base_dir)
                        # CRÍTICO: Garantizar separador POSIX '/' para Linux
                        posix_arcname = rel_path.replace('\\', '/')
                        zipf.write(full_path, posix_arcname)
                        total_files += 1
                        if total_files % 1000 == 0:
                            print(f"  {total_files} archivos procesados...")
            else:
                print(f"Empaquetando archivo: {item_name}")
                posix_arcname = item_name.replace('\\', '/')
                zipf.write(src_path, posix_arcname)
                total_files += 1

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\n[OK] Paquete completado exitosamente:")
    print(f"  Archivo: {zip_path}")
    print(f"  Total archivos: {total_files}")
    print(f"  Tamaño: {size_mb:.2f} MB")

if __name__ == '__main__':
    package()

