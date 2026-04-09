// api/nutriplan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = user.id;

    // GET: получение всех данных пользователя
    if (req.method === 'GET' && req.query.action === 'all') {
        try {
            // Получаем рецепты
            const { data: recipes, error: recipesError } = await supabase
                .from('nutriplan_recipes')
                .select('*')
                .eq('user_id', userId);
            
            if (recipesError) return res.status(500).json({ error: recipesError.message });
            
            // Получаем меню
            const { data: menu, error: menuError } = await supabase
                .from('nutriplan_menu')
                .select('*')
                .eq('user_id', userId);
            
            if (menuError) return res.status(500).json({ error: menuError.message });
            
            // Получаем список покупок
            const { data: shopping, error: shoppingError } = await supabase
                .from('nutriplan_shopping')
                .select('*')
                .eq('user_id', userId);
            
            if (shoppingError) return res.status(500).json({ error: shoppingError.message });
            
            // Преобразуем данные
            const recipesData = (recipes || []).map(r => r.data || r);
            const menuData = (menu && menu.length && menu[0] && menu[0].data) ? menu[0].data : [];
            const shoppingData = (shopping && shopping.length && shopping[0] && shopping[0].data) ? shopping[0].data : [];
            
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
        
        try {
            // Удаляем старые рецепты
            await supabase
                .from('nutriplan_recipes')
                .delete()
                .eq('user_id', userId);
            
            // Сохраняем новые рецепты
            if (recipes && recipes.length) {
                const recipesToInsert = recipes.map(r => ({
                    user_id: userId,
                    data: r
                }));
                const { error: recipesInsertError } = await supabase
                    .from('nutriplan_recipes')
                    .insert(recipesToInsert);
                if (recipesInsertError) return res.status(500).json({ error: recipesInsertError.message });
            }
            
            // Удаляем старое меню
            await supabase
                .from('nutriplan_menu')
                .delete()
                .eq('user_id', userId);
            
            // Сохраняем новое меню
            if (menu && menu.length) {
                const { error: menuInsertError } = await supabase
                    .from('nutriplan_menu')
                    .insert({ user_id: userId, data: menu });
                if (menuInsertError) return res.status(500).json({ error: menuInsertError.message });
            }
            
            // Удаляем старый список покупок
            await supabase
                .from('nutriplan_shopping')
                .delete()
                .eq('user_id', userId);
            
            // Сохраняем новый список покупок
            if (shopping && shopping.length) {
                const { error: shoppingInsertError } = await supabase
                    .from('nutriplan_shopping')
                    .insert({ user_id: userId, data: shopping });
                if (shoppingInsertError) return res.status(500).json({ error: shoppingInsertError.message });
            }
            
            return res.json({ success: true });
        } catch (err) {
            console.error('POST error:', err);
            return res.status(500).json({ error: err.message });
        }
    }
    
    return res.status(404).json({ error: 'Unknown action' });
}
