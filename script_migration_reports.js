// Script de migración para agregar el nuevo módulo de reportes PESV
// Ejecutar en la base de datos de autenticación/usuarios

// 1. Agregar la nueva opción al catálogo global de menú
db.global_menu_catalog.insertOne({
  key: "web_pesv_reports",
  label: "Constructor de Reportes",
  platform: "web",
  category: "PESV",
  route: "/pesv/reports",
  icon: "pi pi-chart-bar",
  order: 50,
  enabled: true,
  description: "Generador automático de reportes personalizables con detección de campos",
  created_at: new Date(),
  updated_at: new Date()
});

// 2. Verificar que se insertó correctamente
const newMenuItem = db.global_menu_catalog.findOne({ key: "web_pesv_reports" });
print("Nueva opción de menú insertada:");
printjson(newMenuItem);

// 3. Opcional: Asignar automáticamente el permiso a todas las empresas ESPECIAL y MIXTO
// (Ejecutar solo si quieres que todas las empresas tengan acceso automático)
/*
const empresasEspecialMixto = db.enterprises.find({
  tipo_habilitacion: { $in: ["ESPECIAL", "MIXTO"] }
}).toArray();

empresasEspecialMixto.forEach(empresa => {
  const usuarios = db.users.find({ enterprise_id: empresa._id.toString() }).toArray();

  usuarios.forEach(usuario => {
    // Solo agregar el permiso si el usuario no lo tiene ya
    if (!usuario.menu_permissions || !usuario.menu_permissions.includes("web_pesv_reports")) {
      db.users.updateOne(
        { _id: usuario._id },
        {
          $addToSet: {
            menu_permissions: "web_pesv_reports"
          }
        }
      );
      print(`Permiso agregado al usuario: ${usuario.username || usuario.nombre} de empresa: ${empresa.razonSocial}`);
    }
  });
});

print("Migración completada. Permisos asignados automáticamente a empresas ESPECIAL y MIXTO.");
*/

print("=== INSTRUCCIONES POST-MIGRACIÓN ===");
print("1. El nuevo módulo 'Constructor de Reportes' está disponible en el catálogo global");
print("2. Los superadmins pueden asignar este permiso desde 'Permisos Menú' en cada empresa");
print("3. La clave del permiso es: web_pesv_reports");
print("4. Solo aparecerá en el menú PESV para empresas ESPECIAL y MIXTO");
print("5. El módulo incluye detección automática de campos cuando se agregan nuevos campos a las colecciones");

// Mostrar estadísticas
const totalEmpresas = db.enterprises.countDocuments({ tipo_habilitacion: { $in: ["ESPECIAL", "MIXTO"] } });
print(`Empresas elegibles (ESPECIAL/MIXTO): ${totalEmpresas}`);