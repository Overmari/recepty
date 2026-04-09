// api/nutriplan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    // CORS настройки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Получаем пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        console.error('Auth error:', userError);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    const userId = user.id;
    console.log(`📌 User ID: ${userId}`);

    // GET: получение всех данных пользователя
    if (req.method === 'GET' && req.query.action === 'all') {
        try {
            console.log('📥 GET /all for user:', userId);
            
            // Получаем рецепты
            const { data: recipes, error: recipesError } = await supabase
                .from('nutriplan_recipes')
                .select('*')
                .eq('user_id', userId);
            
            if (recipesError) {
                console.error('Recipes error:', recipesError);
                return res.status(500).json({ error: recipesError.message });
            }
            
            // Получаем меню
            const { data: menu, error: menuError } = await supabase
                .from('nutriplan_menu')
                .select('*')
                .eq('user_id', userId);
            
            if (menuError) {
                console.error('Menu error:', menuError);
                return res.status(500).json({ error: menuError.message });
            }
            
            // Получаем список покупок
            const { data: shopping, error: shoppingError } = await supabase
                .from('nutriplan_shopping')
                .select('*')
                .eq('user_id', userId);
            
            if (shoppingError) {
                console.error('Shopping error:', shoppingError);
                return res.status(500).json({ error: shoppingError.message });
            }
            
            // Извлекаем данные из JSONB полей
            const recipesData = (recipes || []).map(r => r.data);
            const menuData = (menu && menu.length && menu[0]) ? menu[0].data : [];
            const shoppingData = (shopping && shopping.length && shopping[0]) ? shopping[0].data : [];
            
            console.log(`✅ Loaded: ${recipesData.length} recipes, ${menuData.length} menu days, ${shoppingData.length} shopping items`);
            
            return res.json({
                success: true,
                recipes: recipesData,
                menu: menuData,
                shopping: shoppingData
            });
        } catch (err) {
            console.error('GET error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    // POST: сохранение всех данных
    if (req.method === 'POST' && req.body.action === 'save_all') {
        const { recipes, menu, shopping } = req.body;
        
        console.log(`📤 POST /save_all for user: ${userId}`);
        console.log(`   Recipes: ${recipes?.length || 0}, Menu days: ${menu?.length || 0}, Shopping items: ${shopping?.length || 0}`);
        
        try {
            // 1. Удаляем старые рецепты
            const { error: recipesDeleteError } = await supabase
                .from('nutriplan_recipes')
                .delete()
                .eq('user_id', userId);
            
            if (recipesDeleteError) {
                console.error('Delete recipes error:', recipesDeleteError);
                return res.status(500).json({ error: recipesDeleteError.message });
            }
            
            // 2. Сохраняем новые рецепты
            if (recipes && recipes.length > 0) {
                const recipesToInsert = recipes.map(r => ({
                    user_id: userId,
                    data: r
                }));
                const { error: recipesInsertError } = await supabase
                    .from('nutriplan_recipes')
                    .insert(recipesToInsert);
                if (recipesInsertError) {
                    console.error('Insert recipes error:', recipesInsertError);
                    return res.status(500).json({ error: recipesInsertError.message });
                }
                console.log(`✅ Saved ${recipesToInsert.length} recipes`);
            }
            
            // 3. Удаляем старое меню
            const { error: menuDeleteError } = await supabase
                .from('nutriplan_menu')
                .delete()
                .eq('user_id', userId);
            
            if (menuDeleteError) {
                console.error('Delete menu error:', menuDeleteError);
                return res.status(500).json({ error: menuDeleteError.message });
            }
            
            // 4. Сохраняем новое меню
            if (menu && menu.length > 0) {
                const { error: menuInsertError } = await supabase
                    .from('nutriplan_menu')
                    .insert({ user_id: userId, data: menu });
                if (menuInsertError) {
                    console.error('Insert menu error:', menuInsertError);
                    return res.status(500).json({ error: menuInsertError.message });
                }
                console.log(`✅ Saved menu with ${menu.length} days`);
            }
            
            // 5. Удаляем старый список покупок
            const { error: shoppingDeleteError } = await supabase
                .from('nutriplan_shopping')
                .delete()
                .eq('user_id', userId);
            
            if (shoppingDeleteError) {
                console.error('Delete shopping error:', shoppingDeleteError);
                return res.status(500).json({ error: shoppingDeleteError.message });
            }
            
            // 6. Сохраняем новый список покупок
            if (shopping && shopping.length > 0) {
                const { error: shoppingInsertError } = await supabase
                    .from('nutriplan_shopping')
                    .insert({ user_id: userId, data: shopping });
                if (shoppingInsertError) {
                    console.error('Insert shopping error:', shoppingInsertError);
                    return res.status(500).json({ error: shoppingInsertError.message });
                }
                console.log(`✅ Saved ${shopping.length} shopping items`);
            }
            
            return res.json({ success: true });
        } catch (err) {
            console.error('POST error:', err);
            return res.status(500).json({ error: err.message });
        }
    }
    
    return res.status(404).json({ error: 'Unknown action' });
}
